import mail from "@sendgrid/mail";
import HttpError from "./HttpError.js";

mail.setApiKey(process.env.sendGridToken);

export async function sendMail(message) {
  try {
    await mail.send(message);
  } catch (error) {
    console.log(error);
    console.log(error);
    throw HttpError(500);
  }
}

export async function sendVerificationEmail(mail, url) {
  const message = {
    to: mail,
    from: process.env.verifyMailFrom,
    subject: "Verify Email",
    text: `visit link to verify email ${url}`,
    html: `<a href="${url}">visit link to verify email</a>`,
  };

  try {
    await sendMail(message);
  } catch (error) {
    console.log(error);
    throw HttpError(500);
  }
}
