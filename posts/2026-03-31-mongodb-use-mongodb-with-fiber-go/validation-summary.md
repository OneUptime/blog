# Validation Summary: How to Use MongoDB with Fiber (Go)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go (Golang)
- Fiber v2 (Go web framework)
- MongoDB
- MongoDB Go Driver v1 (`go.mongodb.org/mongo-driver`)

## Sources Consulted
- MongoDB Go Driver v1 API documentation: https://pkg.go.dev/go.mongodb.org/mongo-driver
- MongoDB Go Driver `mongo` package: https://pkg.go.dev/go.mongodb.org/mongo-driver/mongo
- MongoDB Go Driver `options` package: https://pkg.go.dev/go.mongodb.org/mongo-driver/mongo/options
- MongoDB Go Driver `bson` package: https://pkg.go.dev/go.mongodb.org/mongo-driver/bson
- Fiber v2 documentation: https://docs.gofiber.io/
- Fiber v2 API reference: https://pkg.go.dev/github.com/gofiber/fiber/v2

## Issues Found
No technical issues found.

## Review Notes
- The `go get` commands for `go.mongodb.org/mongo-driver/mongo` and `go.mongodb.org/mongo-driver/bson` are redundant since both resolve to the same Go module (`go.mongodb.org/mongo-driver`). A single `go get go.mongodb.org/mongo-driver` would suffice. This is not incorrect, just slightly verbose.
- The post uses the MongoDB Go Driver v1 API. The v2 driver (`go.mongodb.org/mongo-driver/v2`) was released in 2024 with API changes, but v1 remains supported and widely used, so the code is still valid.
- If `MONGO_DB` environment variable is not set, `client.Database("")` would reference a database with an empty name. The running instructions do set this variable, so it is fine in practice.
