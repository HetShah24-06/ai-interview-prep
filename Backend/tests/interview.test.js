jest.mock("../src/models/blacklist.model");
jest.mock("../src/models/interviewReport.model");
jest.mock("../src/services/ai.service");

const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../src/app");
const blacklistModel = require("../src/models/blacklist.model");
const interviewReportModel = require("../src/models/interviewReport.model");
const aiService = require("../src/services/ai.service");

const USER_ID = "507f1f77bcf86cd799439011";
const token = jwt.sign({ id: USER_ID, username: "abc" }, process.env.JWT_SECRET);
const authCookie = `token=${token}`;

beforeEach(() => {
  blacklistModel.findOne.mockResolvedValue(null);
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("POST /api/interview/", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app)
      .post("/api/interview/")
      .field("jobDescription", "Frontend role")
      .field("selfDescription", "I build React apps");

    expect(res.status).toBe(401);
  });

  it("rejects a missing job description", async () => {
    const res = await request(app)
      .post("/api/interview/")
      .set("Cookie", authCookie)
      .field("selfDescription", "I build React apps");

    expect(res.status).toBe(400);
  });

  it("rejects when neither a resume nor a self description is given", async () => {
    const res = await request(app)
      .post("/api/interview/")
      .set("Cookie", authCookie)
      .field("jobDescription", "Frontend role");

    expect(res.status).toBe(400);
  });

  it("generates and saves a report from a self description", async () => {
    aiService.generateInterviewReport.mockResolvedValue({
      matchScore: 80,
      technicalQuestions: [],
      behavioralQuestions: [],
      skillGaps: [],
      preparationPlan: [],
      title: "Frontend Engineer",
    });
    interviewReportModel.create.mockResolvedValue({
      _id: "abc123",
      matchScore: 80,
      title: "Frontend Engineer",
    });

    const res = await request(app)
      .post("/api/interview/")
      .set("Cookie", authCookie)
      .field("jobDescription", "Frontend role")
      .field("selfDescription", "I build React apps");

    expect(res.status).toBe(201);
    expect(aiService.generateInterviewReport).toHaveBeenCalledWith(
      expect.objectContaining({
        jobDescription: "Frontend role",
        selfDescription: "I build React apps",
      }),
    );
    expect(res.body.interviewReport.title).toBe("Frontend Engineer");
  });
});

describe("GET /api/interview/", () => {
  it("lists reports for the logged in user", async () => {
    const chain = { sort: jest.fn(), select: jest.fn() };
    chain.sort.mockReturnValue(chain);
    chain.select.mockResolvedValue([{ _id: "1", title: "Frontend Engineer" }]);
    interviewReportModel.find.mockReturnValue(chain);

    const res = await request(app).get("/api/interview/").set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.interviewReports).toHaveLength(1);
  });
});

describe("GET /api/interview/report/:interviewId", () => {
  it("404s for a report that doesn't belong to the user", async () => {
    interviewReportModel.findOne.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/interview/report/${USER_ID}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
  });

  it("returns the report when found", async () => {
    interviewReportModel.findOne.mockResolvedValue({ _id: USER_ID, title: "Frontend Engineer" });

    const res = await request(app)
      .get(`/api/interview/report/${USER_ID}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.interviewReport.title).toBe("Frontend Engineer");
  });
});
