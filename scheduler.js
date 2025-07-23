require('dotenv').config();
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const moment = require('moment');

// DB config
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Nodemailer transporter setup (using Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,          // e.g. sanjaypyanala8740@gmail.com
    pass: process.env.EMAIL_PASSWORD         // App password or email password
  }
});

// Cron job: every 3 minutes
cron.schedule('0 21 * * 1', () => {
  const now = moment();
  const nextWeek = moment().add(7, 'days');

  const start = now.format('YYYY-MM-DD HH:mm:ss');
  const end = nextWeek.format('YYYY-MM-DD HH:mm:ss');

  const query = `
    SELECT v.user_id, v.vaccine_name, v.appointment_date, v.appointment_time,
           u.email, u.name
    FROM user_vaccine_schedule v
    JOIN users u ON v.user_id = u.id
    WHERE CONCAT(v.appointment_date, ' ', v.appointment_time)
          BETWEEN ? AND ?
  `;



// cron.schedule('*/3 * * * *', () => {
//   const now = moment();
//   const next3Hours = moment().add(3, 'hours');

//   const start = now.format('YYYY-MM-DD HH:mm:ss');
//   const end = next3Hours.format('YYYY-MM-DD HH:mm:ss');

//   const query = `
//     SELECT v.user_id, v.vaccine_name, v.appointment_date, v.appointment_time,
//            u.email, u.name
//     FROM user_vaccine_schedule v
//     JOIN users u ON v.user_id = u.id
//     WHERE CONCAT(v.appointment_date, ' ', v.appointment_time)
//           BETWEEN ? AND ?
//   `;

  // Execute your DB query here using start and end


  db.execute(query, [target], (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return;
    }

    if (results.length === 0) {
      console.log('No vaccine reminders to send at:', target);
      return;
    }

    results.forEach(row => {
      const mailOptions = {
        from: `"Pet Care Reminder" <${process.env.EMAIL_SENDER}>`,
        to: row.email,
        subject: 'Pet Vaccine Reminder 🐶',
        text: `Hello ${row.name || 'User'},\n\nThis is a reminder that your vaccine "${row.vaccine_name}" is scheduled for today at ${row.appointment_time}. Please be ready!`
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error("Nodemailer error:", err, "for user:", row.email);
        } else {
          console.log("📨 Email sent to:", row.email, "| Message ID:", info.messageId);
        }
      });
    });
  });
});

