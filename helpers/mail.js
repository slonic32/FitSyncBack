import Brevo from "@getbrevo/brevo";
import HttpError from "./HttpError.js";

const transactionalApi = new Brevo.TransactionalEmailsApi();

// Send a transactional email via Brevo
export async function sendMail({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.VERIFY_MAIL_FROM;

  if (!apiKey || !senderEmail) {
    throw HttpError(500, "Email service is not configured");
  }

  transactionalApi.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    apiKey
  );

  const email = {
    sender: { email: senderEmail },
    to: [{ email: to }],
    subject,
    textContent: text,
    htmlContent: html,
  };

  try {
    await transactionalApi.sendTransacEmail(email);
  } catch (error) {
    console.log(error);
    throw HttpError(500);
  }
}

export async function sendVerificationEmail(mail, url) {
  const message = {
    to: mail,
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

export async function sendPasswordRecoveryEmail(mail, url) {
  const message = {
    to: mail,
    subject: "Password recovery",
    text: `Visit this link to reset your password: ${url}`,
    html: `<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p>`,
  };

  try {
    await sendMail(message);
  } catch (error) {
    console.log(error);
    throw HttpError(500);
  }
}
