import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email notifying students about a new notice,
 * with a direct "View Notice" button linking to the notice detail page.
 */
const sendNoticeEmail = async (recipientEmails, notice) => {
  if (!recipientEmails || recipientEmails.length === 0) return;

  // Build the direct link to this notice's detail page
  const noticeUrl = `${process.env.FRONTEND_URL}/student-notice-detail.html?id=${notice._id}`;

  const mailOptions = {
    from: `"Digital Notice Board" <${process.env.EMAIL_USER}>`,
    bcc: recipientEmails,
    subject: `New Notice: ${notice.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2952e3; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">📢 New Notice Published</h2>
        </div>
        <div style="border: 1px solid #e4e6ee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <h3 style="color: #1a1d29;">${notice.title}</h3>
          <p><strong>Category:</strong> ${notice.category}</p>
          <p><strong>Department:</strong> ${notice.department}</p>
          <p style="color: #444; line-height: 1.6;">${notice.description}</p>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${noticeUrl}" 
               style="background: #2952e3; color: white; padding: 12px 32px; 
                      border-radius: 8px; text-decoration: none; font-weight: bold; 
                      display: inline-block;">
              View Notice →
            </a>
          </div>

          <p style="margin-top: 24px; font-size: 13px; color: #888;">
            If the button doesn't work, copy and paste this link into your browser:<br />
            <a href="${noticeUrl}" style="color: #2952e3;">${noticeUrl}</a>
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Notice email sent to ${recipientEmails.length} student(s)`);
  } catch (error) {
    console.error("❌ Failed to send notice email:", error.message);
  }
};

export default sendNoticeEmail;