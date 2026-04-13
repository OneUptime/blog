# How to Generate a GraphQL Schema from MongoDB Collections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GraphQL, Schema, Code Generation, Mongoose

Description: Learn how to automatically generate GraphQL type definitions from MongoDB collection schemas using Mongoose models and schema introspection.

---

Manually keeping GraphQL schemas in sync with MongoDB models is tedious and error-prone. Automating schema generation from Mongoose models ensures your GraphQL types always reflect your actual data structure.

## Approach: Generate Types from Mongoose Schemas

The core idea is to walk Mongoose schema paths and convert each path type to its GraphQL equivalent.

```javascript
const mongoose = require('mongoose');

const typeMap = {
  String: 'String',
  Number: 'Float',
  Boolean: 'Boolean',
  Date: 'String',
  ObjectId: 'ID',
  Mixed: 'JSON',
  Array: '[String]',
};

function mongooseTypeToGraphQL(schemaType) {
  const instance = schemaType.instance;
  if (instance === 'Array') {
    const caster = schemaType.embeddedSchemaType;
    if (!caster) return '[String]';
    const inner = typeMap[caster.instance] || 'String';
    return `[${inner}]`;
  }
  return typeMap[instance] || 'String';
}
```

## Walking Schema Paths

```javascript
function generateTypeFromSchema(typeName, schema) {
  const fields = ['  id: ID!'];

  schema.eachPath((pathName, schemaType) => {
    if (pathName === '_id' || pathName === '__v') return;

    const graphqlType = mongooseTypeToGraphQL(schemaType);
    const required = schemaType.isRequired ? '!' : '';
    const fieldName = pathName.replace(/\./g, '_'); // flatten nested paths

    fields.push(`  ${fieldName}: ${graphqlType}${required}`);
  });

  return `type ${typeName} {\n${fields.join('\n')}\n}`;
}
```

## Example with a Mongoose Model

```javascript
const postSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  body:     { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  tags:     [String],
  viewCount:{ type: Number, default: 0 },
  published:{ type: Boolean, default: false },
  createdAt:{ type: Date },
});

const Post = mongoose.model('Post', postSchema);

const generatedType = generateTypeFromSchema('Post', Post.schema);
console.log(generatedType);
```

Output:

```text
type Post {
  id: ID!
  title: String!
  body: String!
  authorId: ID!
  tags: [String]
  viewCount: Float
  published: Boolean
  createdAt: String
}
```

## Generating Query and Mutation Stubs

```javascript
function generateCRUD(typeName) {
  const lower = typeName.charAt(0).toLowerCase() + typeName.slice(1);
  return `
type Query {
  ${lower}(id: ID!): ${typeName}
  ${lower}s(limit: Int, offset: Int): [${typeName}!]!
}

type Mutation {
  create${typeName}(input: ${typeName}Input!): ${typeName}!
  update${typeName}(id: ID!, input: ${typeName}Input!): ${typeName}
  delete${typeName}(id: ID!): Boolean!
}
  `.trim();
}
```

## Using graphql-compose for Advanced Generation

For production use, `graphql-compose-mongoose` generates a full schema with filters, sorting, and pagination:

```bash
npm install graphql-compose graphql-compose-mongoose
```

```javascript
const { composeMongoose } = require('graphql-compose-mongoose');
const { SchemaComposer } = require('graphql-compose');

const schemaComposer = new SchemaComposer();
const PostTC = composeMongoose(Post, { removeFields: ['__v'] });

schemaComposer.Query.addFields({
  postById: PostTC.mongooseResolvers.findById(),
  postMany: PostTC.mongooseResolvers.findMany(),
  postCount: PostTC.mongooseResolvers.count(),
});

schemaComposer.Mutation.addFields({
  postCreateOne: PostTC.mongooseResolvers.createOne(),
  postUpdateById: PostTC.mongooseResolvers.updateById(),
  postRemoveById: PostTC.mongooseResolvers.removeById(),
});

const generatedSchema = schemaComposer.buildSchema();
```

## Writing the Generated Schema to a File

```javascript
const { printSchema } = require('graphql');
const fs = require('fs');

fs.writeFileSync('./schema.generated.graphql', printSchema(generatedSchema));
```

## Summary

Generating GraphQL schemas from Mongoose models eliminates manual duplication. For simple cases, walk schema paths and map Mongoose types to GraphQL scalars. For production APIs with rich filtering and pagination, `graphql-compose-mongoose` generates complete CRUD schemas automatically from your existing models.
