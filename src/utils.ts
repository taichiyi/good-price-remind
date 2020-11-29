import * as nodemailer from 'nodemailer';
import keysJson from './config';
import { ConfigKeys } from './interfaces';

export default class Email {
  keys: ConfigKeys;
  static instance = new Email(keysJson);

  constructor(keys: ConfigKeys) {
    this.keys = keys;
  }

  static getInstance() {
    return this.instance;
  }

  public async sendEmail({ subject = '', text = '', fromName = '好价提醒！' }) {
    if (this.keys === undefined) return;

    const { EmailHost, EmailPort, EmailAuthUser, EmailAuthPass, toEmail } = this.keys;
    const transporter = nodemailer.createTransport({
      host: EmailHost,
      port: EmailPort,
      secure: false, // true for 465, false for other ports
      auth: {
        user: EmailAuthUser, // generated ethereal user
        pass: EmailAuthPass, // generated ethereal password
      },
    });

    // setup email data with unicode symbols
    const mailOptions = {
      from: `"${fromName}" <${EmailAuthUser}>`, // sender address
      to: toEmail, // list of receivers
      subject, // Subject line
      // text, // plain text body
      html: text, // html body
    };

    await new Promise((resolve) => {
      // send mail with defined transport object
      transporter.sendMail(mailOptions, (error) => {
        if (error) {
          console.log(error);
        }
        resolve();
      });
    });
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
