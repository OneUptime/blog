# How to Design an HR Management Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema, Design, Human Resource

Description: Learn how to model an HR management system in MongoDB covering employees, departments, positions, leave requests, and performance reviews.

---

## Core Collections

An HR management system requires: `employees`, `departments`, `positions`, `leaveRequests`, and `performanceReviews`. MongoDB works well here because employee profiles vary by contract type, benefits packages differ, and the hierarchical org chart maps naturally to document references.

## Employee Collection

```json
{
  "_id": "emp-001",
  "employeeNumber": "EMP-1001",
  "personalInfo": {
    "firstName": "Sarah",
    "lastName": "Connor",
    "dob": "1988-03-15",
    "nationalId": "encrypted:xxxx",
    "phone": "+1-555-100-0001",
    "emergencyContact": {
      "name": "John Connor",
      "relation": "spouse",
      "phone": "+1-555-100-0002"
    }
  },
  "workInfo": {
    "departmentId": "dept-engineering",
    "positionId": "pos-senior-engineer",
    "managerId": "emp-050",
    "employmentType": "full-time",
    "startDate": "2020-03-01",
    "endDate": null,
    "workLocation": "remote",
    "email": "sarah.connor@company.com"
  },
  "compensation": {
    "salaryType": "annual",
    "amountCents": 12000000,
    "currency": "USD",
    "lastReviewDate": "2026-01-15"
  },
  "leaveBalance": {
    "annual": { "available": 18, "used": 4 },
    "sick":   { "available": 10, "used": 1 }
  },
  "status": "active",
  "createdAt": "2020-03-01T09:00:00Z"
}
```

## Department Collection

```json
{
  "_id": "dept-engineering",
  "name": "Engineering",
  "code": "ENG",
  "parentDepartmentId": null,
  "headEmployeeId": "emp-050",
  "headcount": 42,
  "costCenter": "CC-1001",
  "location": "New York HQ",
  "createdAt": "2015-01-01T00:00:00Z"
}
```

## Position Collection

```json
{
  "_id": "pos-senior-engineer",
  "title": "Senior Software Engineer",
  "departmentId": "dept-engineering",
  "level": 5,
  "jobFamily": "engineering",
  "isManagement": false,
  "salaryBand": {
    "minCents": 10000000,
    "maxCents": 15000000,
    "currency": "USD"
  },
  "requiredSkills": ["Python", "MongoDB", "Kubernetes"]
}
```

## Leave Request Collection

```json
{
  "_id": ObjectId(),
  "employeeId": "emp-001",
  "type": "annual",
  "status": "approved",
  "startDate": "2026-04-07",
  "endDate":   "2026-04-11",
  "totalDays": 5,
  "reason": "Family vacation",
  "approvedBy": "emp-050",
  "statusHistory": [
    { "status": "pending",  "ts": "2026-03-20T10:00:00Z", "by": "emp-001" },
    { "status": "approved", "ts": "2026-03-21T09:00:00Z", "by": "emp-050" }
  ],
  "createdAt": "2026-03-20T10:00:00Z"
}
```

## Performance Review Collection

```json
{
  "_id": ObjectId(),
  "employeeId": "emp-001",
  "reviewerId": "emp-050",
  "period": "2025-annual",
  "status": "completed",
  "overallRating": 4,
  "goals": [
    { "description": "Deliver Project X", "rating": 5, "comment": "Excellent" },
    { "description": "Improve test coverage", "rating": 4, "comment": "Good progress" }
  ],
  "strengths": "Strong problem-solving and team leadership.",
  "areasForImprovement": "Could improve documentation habits.",
  "salaryAdjustmentPercent": 5,
  "completedAt": "2026-01-15T00:00:00Z"
}
```

## Key Indexes

```javascript
// Employee directory
db.employees.createIndex({ "workInfo.departmentId": 1, status: 1 })
db.employees.createIndex({ "workInfo.managerId": 1 })
db.employees.createIndex({ "personalInfo.lastName": 1, "personalInfo.firstName": 1 })

// Leave management
db.leaveRequests.createIndex({ employeeId: 1, startDate: -1 })
db.leaveRequests.createIndex({ status: 1, startDate: 1 })

// Performance reviews
db.performanceReviews.createIndex({ employeeId: 1, period: 1 }, { unique: true })
```

## Summary

Embed compensation and leave balance directly in the employee document for single-document reads on the employee profile page. Store leave requests and performance reviews in separate collections for independent querying and reporting. Reference managers and departments by ID to support org chart traversal with `$graphLookup`. Encrypt sensitive fields like national IDs at the application layer before storing them in MongoDB.
