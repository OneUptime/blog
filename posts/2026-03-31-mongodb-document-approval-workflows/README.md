# How to Implement Document Approval Workflows in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Workflow, Approval, Document, Status

Description: Build multi-step document approval workflows in MongoDB using status fields, reviewer arrays, and aggregation to track pending and approved items.

---

## Overview

Approval workflows route documents through a series of review steps before they become active. MongoDB's flexible document model is well suited for this: each document can embed its approval chain, reviewer decisions, and comments directly, reducing the need for complex relational joins.

## Document Schema with Approval Chain

Embed the approval state directly in each document so queries remain simple.

```javascript
const exampleDoc = {
  _id: ObjectId(),
  title: "Q2 Budget Proposal",
  content: "...",
  status: "pending_review",
  submittedBy: "user_123",
  submittedAt: new Date(),
  approvalChain: [
    { step: 1, role: "manager", assignedTo: "user_456", decision: null, decidedAt: null, comment: null },
    { step: 2, role: "director", assignedTo: "user_789", decision: null, decidedAt: null, comment: null },
  ],
  currentStep: 1,
  finalDecision: null,
  resolvedAt: null,
};
```

## Submitting a Review Decision

Update the current step's decision and advance to the next step or resolve the workflow.

```javascript
async function submitDecision(db, docId, reviewerId, decision, comment) {
  const { ObjectId } = require("mongodb");
  const col = db.collection("proposals");
  const doc = await col.findOne({ _id: new ObjectId(docId) });

  if (!doc) throw new Error("Document not found");
  const step = doc.approvalChain.find(
    (s) => s.step === doc.currentStep && s.assignedTo === reviewerId
  );
  if (!step) throw new Error("Not authorized to review this step");
  if (step.decision) throw new Error("Step already decided");

  const now = new Date();
  const isApproved = decision === "approved";
  const isLastStep = doc.currentStep === doc.approvalChain.length;

  const update = {
    $set: {
      [`approvalChain.${doc.currentStep - 1}.decision`]: decision,
      [`approvalChain.${doc.currentStep - 1}.decidedAt`]: now,
      [`approvalChain.${doc.currentStep - 1}.comment`]: comment || null,
    },
  };

  if (!isApproved || isLastStep) {
    update.$set.finalDecision = isApproved ? "approved" : "rejected";
    update.$set.status = isApproved ? "approved" : "rejected";
    update.$set.resolvedAt = now;
  } else {
    update.$set.currentStep = doc.currentStep + 1;
    update.$set.status = "pending_review";
  }

  await col.updateOne({ _id: new ObjectId(docId) }, update);
}
```

## Querying Pending Items for a Reviewer

Find all documents waiting for a specific reviewer at the current step.

```javascript
async function getPendingForReviewer(db, reviewerId) {
  return db.collection("proposals").find({
    status: "pending_review",
    $expr: {
      $gt: [
        {
          $size: {
            $filter: {
              input: "$approvalChain",
              cond: {
                $and: [
                  { $eq: ["$$this.step", "$currentStep"] },
                  { $eq: ["$$this.assignedTo", reviewerId] },
                  { $eq: ["$$this.decision", null] },
                ],
              },
            },
          },
        },
        0,
      ],
    },
  }).toArray();
}
```

## Aggregation Report: Approval Funnel

Generate a report showing how many documents are at each step.

```javascript
const funnelReport = await db.collection("proposals").aggregate([
  { $match: { status: { $in: ["pending_review", "approved", "rejected"] } } },
  {
    $group: {
      _id: { status: "$status", currentStep: "$currentStep" },
      count: { $sum: 1 },
    },
  },
  { $sort: { "_id.currentStep": 1 } },
]).toArray();
```

## Index for Fast Reviewer Queries

```javascript
await db.collection("proposals").createIndex({
  status: 1,
  "approvalChain.assignedTo": 1,
  currentStep: 1,
});
```

## Summary

MongoDB's embedded document model allows you to store the entire approval chain inside each proposal document. State transitions update the current step and final decision in a single write, while compound indexes on status and reviewer fields keep pending-queue queries fast. An aggregation pipeline provides real-time funnel metrics across all workflow stages.
