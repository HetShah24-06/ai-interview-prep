jest.mock("../src/models/user.model");
jest.mock("../src/models/blacklist.model");

const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const userModel = require("../src/models/user.model");
const blacklistModel = require("../src/models/blacklist.model");

beforeEach(() => {
  blacklistModel.findOne.mockResolvedValue(null);
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("POST /api/auth/register", () => {
  it("rejects an invalid email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "abc",
      email: "not-an-email",
      password: "123456",
    });

    expect(res.status).toBe(400);
  });

  it("rejects a password shorter than 6 characters", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "abc",
      email: "abc@example.com",
      password: "123",
    });

    expect(res.status).toBe(400);
  });

  it("registers a new user and sets an auth cookie", async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      username: "abc",
      email: "abc@example.com",
    });

    const res = await request(app).post("/api/auth/register").send({
      username: "abc",
      email: "abc@example.com",
      password: "123456",
    });

    expect(res.status).toBe(201);
    expect(res.headers["set-cookie"][0]).toMatch(/^token=/);
    expect(res.headers["set-cookie"].some((c) => c.startsWith("csrfToken="))).toBe(true);
    /* also handed back in the body: the frontend and backend are on
       different domains in production, so JS on the frontend can never
       read a cookie the backend set, even a non-httpOnly one — the body is
       the only channel that actually reaches it */
    expect(res.body.csrfToken).toEqual(expect.any(String));
    expect(res.body.csrfToken.length).toBeGreaterThan(0);
    expect(res.body.user.email).toBe("abc@example.com");
  });

  it("rejects a duplicate account", async () => {
    userModel.findOne.mockResolvedValue({ _id: "1", email: "abc@example.com" });

    const res = await request(app).post("/api/auth/register").send({
      username: "abc",
      email: "abc@example.com",
      password: "123456",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

describe("POST /api/auth/login", () => {
  it("rejects an unknown email", async () => {
    userModel.findOne.mockResolvedValue(null);

    const res = await request(app).post("/api/auth/login").send({
      email: "x@example.com",
      password: "123456",
    });

    expect(res.status).toBe(400);
  });

  it("rejects an incorrect password", async () => {
    const hash = await bcrypt.hash("correct-password", 10);
    userModel.findOne.mockResolvedValue({ _id: "1", email: "x@example.com", password: hash });

    const res = await request(app).post("/api/auth/login").send({
      email: "x@example.com",
      password: "wrong-password",
    });

    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials and sets an auth cookie", async () => {
    const hash = await bcrypt.hash("correct-password", 10);
    userModel.findOne.mockResolvedValue({
      _id: "1",
      username: "abc",
      email: "x@example.com",
      password: hash,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "x@example.com",
      password: "correct-password",
    });

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"][0]).toMatch(/^token=/);
    expect(res.body.csrfToken).toEqual(expect.any(String));
    expect(res.body.csrfToken.length).toBeGreaterThan(0);
  });
});

describe("GET /api/auth/get-me and logout", () => {
  it("rejects get-me with no cookie", async () => {
    const res = await request(app).get("/api/auth/get-me");
    expect(res.status).toBe(401);
  });

  it("returns the user for a valid session", async () => {
    const hash = await bcrypt.hash("correct-password", 10);
    userModel.findOne.mockResolvedValue({
      _id: "1",
      username: "abc",
      email: "x@example.com",
      password: hash,
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "x@example.com",
      password: "correct-password",
    });
    /* a real browser sends every cookie for the domain, not just the
       first Set-Cookie header, so the test needs to forward both */
    const cookie = loginRes.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ");

    userModel.findById.mockResolvedValue({
      _id: "1",
      username: "abc",
      email: "x@example.com",
    });

    const res = await request(app).get("/api/auth/get-me").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("abc");
    expect(res.body.csrfToken).toEqual(expect.any(String));
    expect(res.body.csrfToken.length).toBeGreaterThan(0);
  });

  it("blacklists the token on logout so it can't be reused", async () => {
    const hash = await bcrypt.hash("correct-password", 10);
    userModel.findOne.mockResolvedValue({
      _id: "1",
      username: "abc",
      email: "x@example.com",
      password: hash,
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "x@example.com",
      password: "correct-password",
    });
    const cookie = loginRes.headers["set-cookie"][0];

    blacklistModel.create.mockResolvedValue({});
    const logoutRes = await request(app).get("/api/auth/logout").set("Cookie", cookie);
    expect(logoutRes.status).toBe(200);
    expect(blacklistModel.create).toHaveBeenCalled();

    /* simulate the token now being in the blacklist collection */
    blacklistModel.findOne.mockResolvedValue({ token: "blacklisted" });

    const res = await request(app).get("/api/auth/get-me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });
});
