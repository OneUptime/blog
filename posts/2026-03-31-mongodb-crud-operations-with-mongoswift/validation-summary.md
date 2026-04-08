# Validation Summary: How to Perform CRUD Operations with MongoSwift

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Swift
- MongoSwift (mongo-swift-driver)
- Swift Codable protocol
- Swift async/await (structured concurrency)
- BSON types (BSONObjectID, BSONDocument)

## Sources Consulted
- MongoSwift driver source code: https://github.com/mongodb/mongo-swift-driver
- SwiftBSON source code: https://github.com/mongodb/swift-bson
- MongoSwift API documentation and examples (VaporExample in the driver repo)
- BSON enum definition in swift-bson for `.objectID()` and `.datetime()` cases

## Issues Found
1. **Sort field name used Swift property name instead of CodingKey value (line 78):**
   - **What was wrong:** `FindOptions(limit: 10, sort: ["createdAt": -1])` used the Swift property name `"createdAt"` in the sort document.
   - **What was changed:** Corrected to `["created_at": -1]` to match the CodingKey mapping (`case createdAt = "created_at"`).
   - **Why:** MongoDB stores fields using the CodingKey string values, not the Swift property names. Since the model maps `createdAt` to `"created_at"`, all BSON queries and options must reference `"created_at"` for the sort to work correctly.

## Review Notes
- The MongoSwift driver (mongo-swift-driver) is officially paused by MongoDB. The README states they have stopped development. The driver remains functional but receives no new features or updates. This may be worth noting for readers evaluating it for new projects.
- All CRUD method signatures, parameter labels, result types, and BSON type usage were verified as correct against the driver source code.
- The post force-unwraps optional results (e.g., `insertResult!.insertedID`). This works but in production code, `guard let` unwrapping would be safer since results are nil when write concern is unacknowledged. This is acceptable for a tutorial context.
