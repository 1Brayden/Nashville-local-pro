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

    await env.LEADS_DB.prepare(
      `INSERT INTO leads
      (reference, service, problem, urgency, details, zip, name, phone, email, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'))`
    ).bind(
      ref,
      b.service.trim().slice(0, 60),
      b.problem.trim().slice(0, 120),
      b.urgency.trim().slice(0, 120),
      (b.details || "").trim().slice(0, 2000),
      b.zip.trim(),
      b.name.trim().slice(0, 120),
      b.phone.trim().slice(0, 40),
      b.email.trim().slice(0, 160)
    ).run();

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
