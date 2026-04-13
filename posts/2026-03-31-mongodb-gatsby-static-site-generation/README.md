# How to Use MongoDB with Gatsby for Static Site Generation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Gatsby, Static Site, GraphQL, JavaScript

Description: Learn how to use MongoDB as a data source for Gatsby static site generation by creating a custom source plugin and using GraphQL queries in pages.

---

## How Gatsby Uses External Data Sources

Gatsby pulls data into its GraphQL layer at build time through source plugins. To use MongoDB, you either use an existing plugin like `gatsby-source-mongodb` or build a custom source plugin using Gatsby's Node APIs. The data is fetched once at build time, not at request time, making the output a static HTML site.

## Option 1: gatsby-source-mongodb

Install the plugin:

```bash
npm install gatsby-source-mongodb
npm install mongodb
```

Configure in `gatsby-config.js`:

```javascript
// gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: 'gatsby-source-mongodb',
      options: {
        connectionString: process.env.MONGODB_URI,
        dbName: 'myblog',
        collection: ['posts', 'authors']
      }
    }
  ]
};
```

Query MongoDB data in your pages using GraphQL:

```javascript
// src/pages/index.js
import React from 'react';
import { graphql } from 'gatsby';

export default function IndexPage({ data }) {
  const { allMongodbMyblogPosts: { nodes: posts } } = data;

  return (
    <main>
      <h1>Blog Posts</h1>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </main>
  );
}

export const query = graphql`
  query IndexQuery {
    allMongodbMyblogPosts(sort: { publishedAt: DESC }) {
      nodes {
        id
        title
        excerpt
        publishedAt(formatString: "MMMM DD, YYYY")
      }
    }
  }
`;
```

## Option 2: Custom Source Plugin with gatsby-node.js

For more control, create data nodes directly in `gatsby-node.js`:

```javascript
// gatsby-node.js
const { MongoClient } = require('mongodb');

exports.sourceNodes = async ({ actions, createNodeId, createContentDigest }) => {
  const { createNode } = actions;

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db('myblog');
  const posts = await db.collection('posts').find({
    published: true
  }).toArray();

  for (const post of posts) {
    createNode({
      ...post,
      id: createNodeId(`post-${post._id}`),
      parent: null,
      children: [],
      internal: {
        type: 'BlogPost',
        contentDigest: createContentDigest(post),
        content: JSON.stringify(post)
      }
    });
  }

  await client.close();
};

// Create individual pages from MongoDB data
exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions;

  const result = await graphql(`
    query {
      allBlogPost {
        nodes { _id slug }
      }
    }
  `);

  result.data.allBlogPost.nodes.forEach(post => {
    createPage({
      path: `/posts/${post.slug}`,
      component: require.resolve('./src/templates/post.js'),
      context: { id: post._id }
    });
  });
};
```

## Post Template

```javascript
// src/templates/post.js
import React from 'react';
import { graphql } from 'gatsby';

export default function PostTemplate({ data }) {
  const { blogPost: post } = data;
  return (
    <article>
      <h1>{post.title}</h1>
      <time>{post.publishedAt}</time>
      <div dangerouslySetInnerHTML={{ __html: post.body }} />
    </article>
  );
}

export const query = graphql`
  query PostQuery($id: String!) {
    blogPost(_id: { eq: $id }) {
      title
      body
      publishedAt(formatString: "MMMM DD, YYYY")
      author
    }
  }
`;
```

## Environment Variable Setup

```text
# .env.production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/myblog?retryWrites=true
```

Gatsby requires environment variables prefixed with `GATSBY_` to be accessible in the browser. Since MongoDB URIs should never reach the browser, use unprefixed variables in `gatsby-node.js` only.

## Summary

Gatsby integrates with MongoDB through either the `gatsby-source-mongodb` plugin or a custom `sourceNodes` implementation in `gatsby-node.js`. Data is fetched at build time, transformed into GraphQL nodes, and then queried from page and template components using GraphQL. This approach produces fully static HTML pages with MongoDB as the content source, ideal for blogs and documentation sites that are rebuilt when content changes.
