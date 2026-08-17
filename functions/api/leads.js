export async function onRequestPost({ request, env }) {
  try {
    const b = await request.json();

    const fields = ["service","problem","urgency","zip","name","phone","email"];

    for (const f of fields) {
      if (typeof b[f] !== "string" || !b[f].trim()) {
        return Response.json(
          { error: "Missing required field." },
          { status: 400 }
        );
      }
    }

    if (!/^\d{5}$/.test(b.zip.trim())) {
      return Response.json(
        { error: "Invalid ZIP code." },
        { status: 400 }
      );
    }

    const ref = "NLP-" + crypto.randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase();

    const service = b.service.trim().slice(0, 60);
    const problem = b.problem.trim().slice(0, 120);
    const urgency = b.urgency.trim().slice(0, 120);
    const details = (b.details || "").trim().slice(0, 2000);
    const zip = b.zip.trim();
    const name = b.name.trim().slice(0, 120);
    const phone = b.phone.trim().slice(0, 40);
    const email = b.email.trim().slice(0, 160);

    await env.LEADS_DB.prepare(
      `INSERT INTO leads
      (reference, service, problem, urgency, details, zip, name, phone, email, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'))`
    ).bind(
      ref,
      service,
      problem,
      urgency,
      details,
      zip,
      name,
      phone,
      email
    ).run();

    if (env.RESEND_API_KEY && env.LEAD_NOTIFICATION_EMAIL) {
      const emailResponse = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Nashville Local Pro <onboarding@resend.dev>",
            to: [env.LEAD_NOTIFICATION_EMAIL],
            subject: `NEW LEAD — ${service} — ${zip}`,
            html: `
              <h2>New Nashville Local Pro Lead</h2>
              <p><strong>Reference:</strong> ${ref}</p>
              <p><strong>Service:</strong> ${service}</p>
              <p><strong>Problem:</strong> ${problem}</p>
              <p><strong>Urgency:</strong> ${urgency}</p>
              <p><strong>ZIP:</strong> ${zip}</p>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Phone:</strong> ${phone}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Details:</strong> ${details || "None provided"}</p>
            `
          })
        }
      );

      if (!emailResponse.ok) {
        console.error(
          "Lead saved, but email notification failed:",
          await emailResponse.text()
        );
      }
    }

    return Response.json({
      ok: true,
      reference: ref
    });

  } catch (e) {
    console.error(e);

    return Response.json(
      { error: "Server error." },
      { status: 500 }
    );
  }
}

export async function onRequestGet() {
  return Response.json(
    { error: "Not found." },
    { status: 404 }
  );
}
