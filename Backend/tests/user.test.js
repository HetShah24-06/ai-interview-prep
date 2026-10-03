jest.mock("../src/models/blacklist.model");
jest.mock("../src/models/user.model");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const app = require("../src/app");
const blacklistModel = require("../src/models/blacklist.model");
const userModel = require("../src/models/user.model");

const USER_ID = "507f1f77bcf86cd799439011";
const token = jwt.sign({ id: USER_ID, username: "abc" }, process.env.JWT_SECRET);
const CSRF_TOKEN = "test-csrf-token";
const authCookie = `token=${token}; csrfToken=${CSRF_TOKEN}`;

beforeEach(() => {
  blacklistModel.findOne.mockResolvedValue(null);
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("GET /api/users/profile", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/users/profile");
    expect(res.status).toBe(401);
  });

  it("reports no saved resume when none exists", async () => {
    userModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: USER_ID,
        username: "abc",
        email: "abc@example.com",
        resumeFileName: undefined,
      }),
    });

    const res = await request(app).get("/api/users/profile").set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.user.resume).toBeNull();
  });

  it("reports saved-resume metadata when one exists", async () => {
    const updatedAt = new Date();
    userModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: USER_ID,
        username: "abc",
        email: "abc@example.com",
        resumeFileName: "resume.pdf",
        resumeUpdatedAt: updatedAt,
      }),
    });

    const res = await request(app).get("/api/users/profile").set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.user.resume.fileName).toBe("resume.pdf");
  });
});

describe("PUT /api/users/resume", () => {
  it("rejects a request missing the CSRF header", async () => {
    const res = await request(app).put("/api/users/resume").set("Cookie", authCookie);
    expect(res.status).toBe(403);
  });

  it("rejects a request with no file attached", async () => {
    const res = await request(app)
      .put("/api/users/resume")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", CSRF_TOKEN);

    expect(res.status).toBe(400);
  });

  it("rejects a file that isn't a real PDF", async () => {
    const res = await request(app)
      .put("/api/users/resume")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", CSRF_TOKEN)
      .attach("resume", Buffer.from("not a pdf"), { filename: "resume.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/users/resume", () => {
  it("rejects a request missing the CSRF header", async () => {
    const res = await request(app).delete("/api/users/resume").set("Cookie", authCookie);
    expect(res.status).toBe(403);
  });

  it("removes the saved resume", async () => {
    userModel.findByIdAndUpdate.mockResolvedValue({});

    const res = await request(app)
      .delete("/api/users/resume")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", CSRF_TOKEN);

    expect(res.status).toBe(200);
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ $unset: expect.any(Object) }),
    );
  });
});

describe("GET /api/users/resume", () => {
  it("404s when no resume is saved", async () => {
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({}) });

    const res = await request(app).get("/api/users/resume").set("Cookie", authCookie);

    expect(res.status).toBe(404);
  });

  it("streams the saved PDF when one exists", async () => {
    userModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        resumeFile: Buffer.from("%PDF-1.4 fake"),
        resumeFileName: "resume.pdf",
      }),
    });

    const res = await request(app).get("/api/users/resume").set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });
});

describe("PUT /api/users/email", () => {
  it("rejects a request missing the CSRF header", async () => {
    const res = await request(app).put("/api/users/email").set("Cookie", authCookie);
    expect(res.status).toBe(403);
  });

  it("rejects a malformed new email", async () => {
    const res = await request(app)
      .put("/api/users/email")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", CSRF_TOKEN)
      .send({ newEmail: "not-an-email", currentPassword: "whatever" });

    expect(res.status).toBe(400);
  });

  it("rejects an incorrect current password", async () => {
    const hash = await bcrypt.hash("correct-password", 10);
    userModel.findById.mockResolvedValue({ _id: USER_ID, password: hash });

    const res = await request(app)
      .put("/api/users/email")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", CSRF_TOKEN)
      .send({ newEmail: "new@example.com", currentPassword: "wrong-password" });

    expect(res.status).toBe(400);
  });

  it("rejects an email already in use by another account", async () => {
    const hash = await bcrypt.hash("correct-password", 10);
    userModel.findById.mockResolvedValue({ _id: USER_ID, password: hash });
    userModel.findOne.mockResolvedValue({ _id: "someone-else" });

    const res = await request(app)
      .put("/api/users/email")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", CSRF_TOKEN)
      .send({ newEmail: "taken@example.com", currentPassword: "correct-password" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("updates the email with the correct current password", async () => {
    const hash = await bcrypt.hash("correct-password", 10);
    const user = { _id: USER_ID, username: "abc", email: "old@example.com", password: hash, save: jest.fn() };
    userModel.findById.mockResolvedValue(user);
    userModel.findOne.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/users/email")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", CSRF_TOKEN)
      .send({ newEmail: "new@example.com", currentPassword: "correct-password" });

    expect(res.status).toBe(200);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.user.email).toBe("new@example.com");
  });
});

describe("PUT /api/users/password", () => {
  it("rejects a request missing the CSRF header", async () => {
    const res = await request(app).put("/api/users/password").set("Cookie", authCookie);
    expect(res.status).toBe(403);
  });

  it("rejects a new password shorter than 6 characters", async () => {
    const res = await request(app)
      .put("/api/users/password")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", CSRF_TOKEN)
      .send({ currentPassword: "whatever", newPassword: "123" });

    expect(res.status).toBe(400);
  });

  it("rejects an incorrect current password", async () => {
    const hash = await bcrypt.hash("correct-password", 10);
    userModel.findById.mockResolvedValue({ _id: USER_ID, password: hash });

    const res = await request(app)
      .put("/api/users/password")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", CSRF_TOKEN)
      .send({ currentPassword: "wrong-password", newPassword: "new-password-123" });

    expect(res.status).toBe(400);
  });

  it("updates the password with the correct current password", async () => {
    const hash = await bcrypt.hash("correct-password", 10);
    const user = { _id: USER_ID, password: hash, save: jest.fn() };
    userModel.findById.mockResolvedValue(user);

    const res = await request(app)
      .put("/api/users/password")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", CSRF_TOKEN)
      .send({ currentPassword: "correct-password", newPassword: "new-password-123" });

    expect(res.status).toBe(200);
    expect(user.save).toHaveBeenCalled();
  });
});
