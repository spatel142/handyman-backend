require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require("nodemailer");

const app = express();
const PORT= process.env.PORT || 5000;

//middleware
//app.use(cors({origin:'http://localhost:5173'}));
app.use(cors());
app.use(express.json());
//MONGODB_URI=mongodb+srv://handymanUser:Robqw2RLiX1lZi24@handymancluster.mjcalxu.mongodb.net/?retryWrites=true&w=majority&appName=HandymanCluster
//conect to mongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('connected to mongoBD'))
.catch(err => {
    console.error('mongoDB connection error:' , err);
    process.exit(1);
});
console.log("ADMIN_EMAIL:", process.env.ADMIN_EMAIL);
console.log("ADMIN_EMAIL_PASS:", process.env.ADMIN_PASS ? "Loaded ✅" : "❌ Missing");
//mail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASS,  // 16-digit Gmail App Password
  }
});


/*--------Models-----------*/
const { Schema, model} = mongoose;

const ServiceSchema = new Schema({
    title:{ type: String, required:true},
    description:String,
    price: Number,

},{ timestamps:true});

const BookingSchema = new Schema({
    name: {type:String, required: true},
    email: String,
    phone: Number,
    service:{type:Schema.Types.ObjectId, ref:'Service', required:true},
    date: Date,
    address: String,
    status: { type: String, default:'requested'},
    notes: String
},{ timestamps:true});

const ContactSchema = new Schema({
    name: String,
    email: String,
    message: String
},{timestamps:true});

const Service = mongoose.model('Service', ServiceSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const Contact = mongoose.model('Contact', ContactSchema);

/*-------Routes--------*/

//to test
app.get('/api/health', (req,res) => res.json({ ok:true}));

//Services
app.get('/api/services', async (req,res) => {
    const services = await Service.find().sort({ createdAt: -1});
    res.json(services);
});

app.get('/api/services/:id', async(req,res) => {
    const service = await Service.findById(req.params.id);
    if(!service) return res.status(404).json({ error: 'Not found'});
    res.json(service);
});

//(admin) create service
app.post('/api/services', async (req,res) =>{
    const s = new Service(req.body);
    await s.save();
    res.status(201).json(s);
});

//Booking
app.post('/api/bookings' , async (req,res) =>{
    try{
        if (req.body.date && isNaN(Date.parse(req.body.date))) {
    return res.status(400).json({ error: "Invalid date format" });
}

        const b = new Booking(req.body);
        await b.save();

       const booking = await Booking.findById(b._id).populate('service');

          console.log("📧 Attempting to send email...");
        //SEND EMAIL
        try {
            const info = await transporter.sendMail({
                 from:`"Handyman Services" <${process.env.ADMIN_EMAIL}>`,
            to: process.env.ADMIN_EMAIL,
            subject:"New Service Request",
            text: `
            You got a new booking request from ${booking.name}
                Email: ${booking.email}
                Phone:${booking.phone}
                Service: ${booking.service ? booking.service.title : 'N/A'}
                Description:${booking.notes}
                Address:${booking.address}
                Date: ${booking.date} `,
                
            });
            console.log("📧 Email sent:", info.response);
        } catch (emailErr) {
            console.log("❌ Email sending failed:", emailErr);
        }

         console.log("✅ Email sent successfully");
        res.status(201).json(b);
    } catch(err){
        res.status(400).json({ error: err.message});
    }
});




//(admin) get bookings
app.get('/api/bookings', async (req,res) =>{
    const bookings = await Booking.find().populate('service').sort({ createAt:-1});
    res.json(bookings);
}) ;

//Contact msg
app.post('/api/contact', async (req,res) =>{
    const msg = new Contact(req.body);
    await msg.save();
    res.status(201).json({ ok: true});
});

app.listen(PORT, () =>{
    console.log(`Server running on http://localhost:${PORT}`);
});

//https://handyman-backend-4esx.onrender.com/