# How to Build a Survey and Polling System with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Survey, Polling, Schema Design, Aggregation

Description: Learn how to design and build a survey and polling system with MongoDB covering schema design, response collection, duplicate prevention, and result aggregation.

---

## Schema Design

A survey system needs flexible question types, response tracking per user, and efficient aggregation for results.

```javascript
// Survey/Poll document
{
  _id: ObjectId(),
  title: "Developer Tools Survey 2026",
  description: "Annual survey on tooling preferences",
  type: "survey",       // or "poll" (single question)
  status: "active",     // draft, active, closed
  questions: [
    {
      id: "q1",
      type: "single_choice",
      text: "Which database do you use most?",
      options: [
        { id: "opt1", text: "MongoDB" },
        { id: "opt2", text: "PostgreSQL" },
        { id: "opt3", text: "MySQL" }
      ]
    },
    {
      id: "q2",
      type: "multi_choice",
      text: "Which cloud providers do you use?",
      options: [{ id: "a", text: "AWS" }, { id: "b", text: "GCP" }, { id: "c", text: "Azure" }]
    },
    {
      id: "q3",
      type: "rating",
      text: "How satisfied are you?",
      min: 1,
      max: 5
    }
  ],
  createdBy: ObjectId("..."),
  startsAt: ISODate(),
  endsAt: ISODate(),
  createdAt: ISODate()
}

// Response document (one per user per survey)
{
  _id: ObjectId(),
  surveyId: ObjectId("..."),
  userId: ObjectId("..."),   // null for anonymous
  sessionId: "anon-token",   // for anonymous dedup
  answers: {
    "q1": "opt1",
    "q2": ["a", "c"],
    "q3": 4
  },
  submittedAt: ISODate()
}
```

## Setting Up Collections and Indexes

```javascript
async function setupSurveySystem(db) {
  const responses = db.collection('responses');

  // Prevent duplicate responses per user per survey
  await responses.createIndex({ surveyId: 1, userId: 1 }, {
    unique: true,
    partialFilterExpression: { userId: { $exists: true, $ne: null } },
  });

  // Index for anonymous dedup by session
  await responses.createIndex({ surveyId: 1, sessionId: 1 }, {
    unique: true,
    partialFilterExpression: { sessionId: { $type: 'string' } },
  });

  await responses.createIndex({ surveyId: 1, submittedAt: -1 });
}
```

## Submitting a Response

```javascript
async function submitResponse(db, { surveyId, userId, sessionId, answers }) {
  const survey = await db.collection('surveys').findOne({
    _id: surveyId,
    status: 'active',
    endsAt: { $gt: new Date() },
  });
  if (!survey) throw new Error('Survey is not active');

  // Validate that all required questions are answered
  const requiredQuestions = survey.questions.map((q) => q.id);
  for (const qId of requiredQuestions) {
    if (answers[qId] === undefined) throw new Error(`Missing answer for question ${qId}`);
  }

  try {
    await db.collection('responses').insertOne({
      surveyId,
      userId: userId || null,
      sessionId: userId ? null : sessionId,
      answers,
      submittedAt: new Date(),
    });
  } catch (err) {
    if (err.code === 11000) throw new Error('Already responded to this survey');
    throw err;
  }
}
```

## Aggregating Results

```javascript
async function getSurveyResults(db, surveyId) {
  const survey = await db.collection('surveys').findOne({ _id: surveyId });
  if (!survey) throw new Error('Survey not found');

  const totalResponses = await db.collection('responses').countDocuments({ surveyId });

  // Aggregate answer distribution per question
  const results = {};
  for (const question of survey.questions) {
    const qId = question.id;
    if (question.type === 'rating') {
      const stats = await db.collection('responses').aggregate([
        { $match: { surveyId } },
        { $group: { _id: null, avg: { $avg: `$answers.${qId}` }, count: { $sum: 1 } } },
      ]).next();
      results[qId] = { type: 'rating', avg: stats?.avg?.toFixed(2), count: stats?.count };
    } else if (question.type === 'multi_choice') {
      const dist = await db.collection('responses').aggregate([
        { $match: { surveyId } },
        { $unwind: `$answers.${qId}` },
        { $group: { _id: `$answers.${qId}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray();
      results[qId] = { type: question.type, distribution: dist };
    } else {
      const dist = await db.collection('responses').aggregate([
        { $match: { surveyId } },
        { $group: { _id: `$answers.${qId}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray();
      results[qId] = { type: question.type, distribution: dist };
    }
  }

  return { totalResponses, results };
}
```

## Summary

A MongoDB survey system uses embedded question arrays for flexibility, a separate responses collection with partial unique indexes to prevent duplicate submissions, and aggregation pipelines for result tabulation. The schema supports multiple question types (single choice, multi-choice, rating) within the same document, making it adaptable to surveys of any complexity.
