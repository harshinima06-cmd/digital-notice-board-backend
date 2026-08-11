import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendNoticeEmail = async (recipientEmails, notice) => {
  if (!recipientEmails || recipientEmails.length === 0) return;

  const noticeUrl =`${process.env.FRONTEND_URL}/student-notice-detail.html?id=${notice._id}`;

  try {
    const { data, error } = await resend.emails.send({
      from: "Digital Notice Board <onboarding@resend.dev>",
      to: ["harshinima06@gmail.com"],
      subject: `New Notice: ${notice.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2>📢 New Notice Published</h2>

          <h3>${notice.title}</h3>
          <p><strong>Category:</strong> ${notice.category}</p>
          <p><strong>Department:</strong> ${notice.department}</p>
          <p>${notice.description}</p>

          <a href="${noticeUrl}"
             style="background:#2952e3;color:white;padding:12px 25px;
                    text-decoration:none;border-radius:6px;display:inline-block;">
            View Notice →
          </a>
        </div>
      `,
    });

    if (error) {
      console.error("❌ Resend email error:", error);
      return;
    }

    console.log(`✅ Notice email sent successfully: ${data.id}`);
  } catch (error) {
    console.error("❌ Failed to send notice email:", error.message);
  }
};

export default sendNoticeEmail;