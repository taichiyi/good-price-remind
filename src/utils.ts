import * as fs from 'fs';
import * as nodemailer from 'nodemailer';
import * as request from 'request';
import { ConfigKeys } from './interfaces';

export default class Email {
  private keys: ConfigKeys | undefined;

  public constructor(keys: ConfigKeys) {
    this.keys = keys;
  }

  public async sendEmail({
    subject = '',
    text = '',
    fromName = '好价提醒！',
  }) {
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

    await new Promise(resolve => {
      // send mail with defined transport object
      transporter.sendMail(mailOptions, (error) => {
        if (error) {
          console.log(error);
        }
        resolve();
      });
    });
  };
}

export const requestPromise = (params: any): Promise<any> =>
  new Promise(resolve => {
    request(params, (err: string, httpResponse: request.Response, body: string) =>
      resolve({
        err,
        httpResponse,
        body,
      }),
    );
  });

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
