# How to Design an Education Platform Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema, Design, Education

Description: Learn how to model an e-learning platform in MongoDB covering courses, lessons, enrollments, quizzes, and student progress tracking.

---

## Core Collections

An education platform needs: `courses`, `lessons`, `enrollments`, `quizzes`, `submissions`, and `users`. MongoDB's document model works well because course content structure varies by type (video, quiz, text), and progress data is read together with enrollment info.

## Course Collection

```json
{
  "_id": "course-001",
  "title": "Introduction to Python",
  "slug": "intro-to-python",
  "instructorId": "user-instructor-01",
  "category": "programming",
  "level": "beginner",
  "language": "en",
  "description": "Learn Python from scratch with hands-on projects.",
  "thumbnail": "https://cdn.example.com/courses/python-intro.jpg",
  "priceCents": 2999,
  "currency": "USD",
  "status": "published",
  "syllabus": [
    { "moduleId": "mod-01", "title": "Getting Started", "lessonCount": 5 },
    { "moduleId": "mod-02", "title": "Data Types",       "lessonCount": 7 }
  ],
  "stats": {
    "enrolledCount": 12430,
    "avgRating": 4.7,
    "reviewCount": 890,
    "completionRate": 0.68
  },
  "tags": ["python", "programming", "beginner"],
  "createdAt": "2025-06-01T00:00:00Z",
  "updatedAt": "2026-02-15T00:00:00Z"
}
```

## Lesson Collection

```json
{
  "_id": "lesson-010",
  "courseId": "course-001",
  "moduleId": "mod-01",
  "order": 3,
  "title": "Variables and Data Types",
  "type": "video",
  "content": {
    "videoUrl": "https://cdn.example.com/lessons/lesson-010.mp4",
    "durationSeconds": 720,
    "transcript": "In this lesson we explore..."
  },
  "isFree": false,
  "resources": [
    { "name": "Cheatsheet.pdf", "url": "https://cdn.example.com/resources/cheatsheet.pdf" }
  ],
  "createdAt": "2025-06-10T00:00:00Z"
}
```

## Enrollment Collection with Progress

```json
{
  "_id": "enrollment-001",
  "userId": "user-student-99",
  "courseId": "course-001",
  "status": "active",
  "enrolledAt": "2026-01-10T09:00:00Z",
  "completedAt": null,
  "progress": {
    "completedLessons": ["lesson-001", "lesson-002", "lesson-010"],
    "totalLessons": 35,
    "percentComplete": 8,
    "lastAccessedLesson": "lesson-010",
    "lastAccessedAt": "2026-03-30T18:00:00Z"
  },
  "certificateId": null
}
```

`completedLessons` is bounded by the number of lessons in the course (typically under 100), so embedding it here is safe.

## Quiz and Submission Collections

Quiz:

```json
{
  "_id": "quiz-mod01",
  "courseId": "course-001",
  "moduleId": "mod-01",
  "title": "Module 1 Quiz",
  "passingScore": 70,
  "questions": [
    {
      "questionId": "q-01",
      "text": "What does `print()` do in Python?",
      "type": "multiple_choice",
      "options": ["Outputs to console", "Reads input", "Creates a file"],
      "correctIndex": 0
    }
  ]
}
```

Submission:

```json
{
  "_id": "submission-001",
  "quizId": "quiz-mod01",
  "userId": "user-student-99",
  "courseId": "course-001",
  "answers": [{ "questionId": "q-01", "selectedIndex": 0 }],
  "score": 90,
  "passed": true,
  "submittedAt": "2026-03-30T18:30:00Z"
}
```

## Key Indexes

```javascript
db.courses.createIndex({ status: 1, category: 1, "stats.avgRating": -1 })
db.courses.createIndex({ title: "text", description: "text", tags: "text" })
db.lessons.createIndex({ courseId: 1, moduleId: 1, order: 1 })
db.enrollments.createIndex({ userId: 1, courseId: 1 }, { unique: true })
db.enrollments.createIndex({ courseId: 1, status: 1 })
db.submissions.createIndex({ userId: 1, quizId: 1 })
```

## Summary

Embed lesson progress as an array within the enrollment document since progress is always read alongside enrollment data. Store lessons in a separate collection for independent ordering and editing. Keep quiz questions embedded within the quiz document since question count is bounded. Use text indexes on course title, description, and tags for full-text course discovery. Track course-level statistics (`enrolledCount`, `avgRating`) as denormalized counters updated by background jobs.
