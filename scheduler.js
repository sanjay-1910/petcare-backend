// require('dotenv').config();
// const mysql = require('mysql2');
// const AWS = require('aws-sdk');
// const cron = require('node-cron');
// const moment = require('moment');
// // require('dotenv').config();
// // AWS config
// AWS.config.update({
//   region:  'us-east-1',
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
// });
// const sns = new AWS.SNS();

// const db = mysql.createPool({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0,
// });

// // Cron job: every 15 minutes
// cron.schedule('*/15 * * * *', () => {
//   const now = moment();
//   const target = now.add(5, 'hours').format('YYYY-MM-DD HH:mm:00');

//   const query = `
//     SELECT v.user_id, v.vaccine_name, v.appointment_date, v.appointment_time,
//            u.email, u.name
//     FROM user_vaccine_schedule v
//     JOIN users u ON v.user_id = u.id
//     WHERE CONCAT(v.appointment_date, ' ', v.appointment_time) = ?
//   `;

//   db.execute(query, [target], (err, results) => {
//     if (err) {
//       console.error('DB error:', err);
//       return;
//     }
//     console.log(results);

//     results.forEach(row => {
//       const message = `Hello ${row.name || 'User'},\n\nThis is a reminder that your vaccine "${row.vaccine_name}" is scheduled for today at ${row.appointment_time}. Please be ready!`;

//       const params = {
//         Message: message,
//         Subject: 'Pet Vaccine Reminder 🐶',
//         // TopicArn: 'arn:aws:sns:ap-south-1:YOUR_ACCOUNT_ID:vaccine-reminder-topic'
//         TopicArn: 'arn:aws:sns:us-east-1:409010723129:vaccine-remainder-topic'
//       };

//       sns.publish(params, (err, data) => {
//         if (err) {
//           console.error("SNS error:", err);
//         } else {
//           console.log("📨 Email sent to:", row.email);
//         }
//       });
//     });
//   });
// });





// require('dotenv').config();
// const mysql = require('mysql2');
// const AWS = require('aws-sdk');
// const cron = require('node-cron');
// const moment = require('moment');

// // AWS config
// AWS.config.update({
//   region: 'us-east-1',
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
// });
// const ses = new AWS.SES({ apiVersion: '2010-12-01' });

// const db = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

// // Cron job: every 15 minutes
// cron.schedule('*/3 * * * *', () => {
//   const now = moment();
//   // add 5 hours to current time, and format for comparison
//   const target = now.add(5, 'hours').format('YYYY-MM-DD HH:mm:00');

//   const query = `
//     SELECT v.user_id, v.vaccine_name, v.appointment_date, v.appointment_time,
//            u.email, u.name
//     FROM user_vaccine_schedule v
//     JOIN users u ON v.user_id = u.id
//     WHERE CONCAT(v.appointment_date, ' ', v.appointment_time) = ?
//   `;

//   db.execute(query, [target], (err, results) => {
//     if (err) {
//       console.error('DB error:', err);
//       return;
//     }
//     if (results.length === 0) {
//       console.log('No vaccine reminders to send at:', target);
//       return;
//     }

//     results.forEach(row => {
//       const emailParams = {
//         Source: 'sanjaypyanala8740@gmail.com', // Your verified SES sender email, e.g. pynalas@gmail.com
//         Destination: {
//           ToAddresses: [row.email] // recipient user email
//         },
//         Message: {
//           Subject: {
//             Data: 'Pet Vaccine Reminder 🐶'
//           },
//           Body: {
//             Text: {
//               Data: `Hello ${row.name || 'User'},\n\nThis is a reminder that your vaccine "${row.vaccine_name}" is scheduled for today at ${row.appointment_time}. Please be ready!`
//             }
//           }
//         }
//       };

//       ses.sendEmail(emailParams, (err, data) => {
//         if (err) {
//           console.error("SES sendEmail error:", err, "for user:", row.email);
//         } else {
//           console.log("📨 Email sent to:", row.email);
//         }
//       });
//     });
//   });
// });



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
cron.schedule('*/10 * * * *', () => {
  const now = moment();
  const target = now.add(24, 'hours').format('YYYY-MM-DD HH:mm:00');

  const query = `
    SELECT v.user_id, v.vaccine_name, v.appointment_date, v.appointment_time,
           u.email, u.name
    FROM user_vaccine_schedule v
    JOIN users u ON v.user_id = u.id
    WHERE CONCAT(v.appointment_date, ' ', v.appointment_time) = ?
  `;

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

