# Validation Summary: How to Use MongoDB with Redwood.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Redwood.js
- Prisma (MongoDB connector)
- GraphQL
- TypeScript

## Sources Consulted
- Prisma MongoDB connector documentation: https://www.prisma.io/docs/orm/overview/databases/mongodb
- Redwood.js documentation: https://redwoodjs.com/docs
- Prisma schema reference for MongoDB: https://www.prisma.io/docs/orm/reference/prisma-schema-reference

## Issues Found
No technical issues found.

## Review Notes
- The Prisma MongoDB schema correctly uses `@id @default(auto()) @map("_id") @db.ObjectId` for ObjectId primary keys and `@db.ObjectId` on foreign key fields.
- The use of `yarn rw prisma db push` is correct for MongoDB, as Prisma does not support `prisma migrate` for MongoDB — only `db push` is available.
- The GraphQL SDL omits `updatedAt` and `authorId` from the `Post` type, which is a valid design choice (not an error). The `updatedAt` is auto-managed by Prisma's `@updatedAt` attribute, and the author relationship is exposed via the `author` field instead of the raw foreign key.
- The `gql` tag in SDL files is auto-imported by Redwood.js, so the lack of an explicit import is correct.
