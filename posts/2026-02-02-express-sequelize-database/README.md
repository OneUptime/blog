# How to Handle Database with Sequelize and Express

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Express.js, Node.js, Sequelize, Database, ORM

Description: A comprehensive guide to building robust database-driven Express.js applications with Sequelize ORM, covering project structure, models, migrations, API routes, error handling, and production best practices.

---

Building database-driven web applications requires careful consideration of how your application connects to, queries, and manages data. Sequelize ORM combined with Express.js provides a powerful foundation for building scalable Node.js APIs with clean, maintainable code.

This guide goes beyond basic ORM usage to show you how to structure a production-ready Express application with Sequelize, including proper separation of concerns, error handling, validation, and performance optimization.

## Understanding the Architecture

Before diving into code, let's understand how Sequelize fits into an Express application:

```mermaid
flowchart TD
    A[Client Request] --> B[Express Router]
    B --> C[Controller]
    C --> D[Service Layer]
    D --> E[Sequelize Models]
    E --> F[(Database)]
    F --> E
    E --> D
    D --> C
    C --> G[JSON Response]
    G --> A
```

This layered architecture separates concerns:
- **Routers** define API endpoints and middleware
- **Controllers** handle request/response logic
- **Services** contain business logic
- **Models** define data structure and database interactions

## Project Setup

### Installation

First, initialize your project and install the required dependencies.

```bash
# Initialize a new Node.js project
npm init -y

# Install Express and Sequelize core packages
npm install express sequelize

# Install PostgreSQL driver (or mysql2 for MySQL, sqlite3 for SQLite)
npm install pg pg-hstore

# Install development dependencies for migrations and environment management
npm install --save-dev sequelize-cli dotenv nodemon
```

### Directory Structure

A well-organized project structure makes your application easier to maintain and scale.

```
project/
├── src/
│   ├── config/
│   │   └── database.js       # Database configuration
│   ├── models/
│   │   ├── index.js          # Model loader and associations
│   │   ├── user.model.js     # User model
│   │   └── post.model.js     # Post model
│   ├── migrations/           # Database migrations
│   ├── seeders/              # Seed data
│   ├── controllers/
│   │   ├── user.controller.js
│   │   └── post.controller.js
│   ├── services/
│   │   ├── user.service.js
│   │   └── post.service.js
│   ├── routes/
│   │   ├── index.js          # Route aggregator
│   │   ├── user.routes.js
│   │   └── post.routes.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validator.js
│   └── app.js                # Express app setup
├── .env                      # Environment variables
├── .sequelizerc              # Sequelize CLI configuration
└── package.json
```

### Environment Configuration

Create a `.env` file to store database credentials and other environment-specific settings.

```bash
# .env
NODE_ENV=development
PORT=3000

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp_development
DB_USER=postgres
DB_PASSWORD=your_password

# Production database URL (used in production)
DATABASE_URL=postgres://user:password@host:5432/database
```

### Sequelize CLI Configuration

The `.sequelizerc` file tells the Sequelize CLI where to find configuration files and where to generate migrations.

```javascript
// .sequelizerc
const path = require('path');

module.exports = {
  'config': path.resolve('src', 'config', 'database.js'),
  'models-path': path.resolve('src', 'models'),
  'seeders-path': path.resolve('src', 'seeders'),
  'migrations-path': path.resolve('src', 'migrations'),
};
```

## Database Configuration

### Connection Setup

Create a database configuration that supports multiple environments and connection pooling for optimal performance.

```javascript
// src/config/database.js
require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    // Connection pool settings for development
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    // Log SQL queries in development
    logging: console.log,
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME + '_test',
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    // Use DATABASE_URL in production (common in cloud platforms)
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    // Larger pool for production traffic
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000,
    },
    // Disable logging in production for performance
    logging: false,
  },
};
```

## Defining Models

### Model Index File

The model index file initializes Sequelize, loads all models, and sets up associations. This pattern allows automatic model discovery.

```javascript
// src/models/index.js
const { Sequelize } = require('sequelize');
const config = require('../config/database.js');
const fs = require('fs');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize with the appropriate configuration
let sequelize;
if (dbConfig.use_env_variable) {
  // Production: use connection URL from environment
  sequelize = new Sequelize(process.env[dbConfig.use_env_variable], dbConfig);
} else {
  // Development/Test: use individual connection parameters
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    dbConfig
  );
}

const db = {};

// Automatically load all model files in the models directory
fs
  .readdirSync(__dirname)
  .filter((file) => {
    // Include only .js files, exclude index.js and test files
    return (
      file.indexOf('.') !== 0 &&
      file !== 'index.js' &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach((file) => {
    // Import and initialize each model
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Set up associations between models
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
```

### User Model

Define models with proper validations, hooks, and instance methods for encapsulated business logic.

```javascript
// src/models/user.model.js
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'Email address is already registered',
      },
      validate: {
        isEmail: {
          msg: 'Please provide a valid email address',
        },
        notEmpty: {
          msg: 'Email is required',
        },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [8, 100],
          msg: 'Password must be at least 8 characters long',
        },
      },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'First name is required',
        },
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'moderator'),
      defaultValue: 'user',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Virtual field computed from firstName and lastName
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.firstName} ${this.lastName}`;
      },
    },
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Enables soft deletes with deletedAt column
    // Exclude password from default JSON serialization
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    scopes: {
      // Include password when explicitly needed
      withPassword: {
        attributes: { include: ['password'] },
      },
      // Only active users
      active: {
        where: { isActive: true },
      },
      // Users with admin role
      admins: {
        where: { role: 'admin' },
      },
    },
  });

  // Hash password before creating a new user
  User.beforeCreate(async (user) => {
    if (user.password) {
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });

  // Hash password before updating if it changed
  User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });

  // Instance method to verify password
  User.prototype.checkPassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  // Instance method to get safe user object
  User.prototype.toSafeObject = function() {
    const { id, email, firstName, lastName, role, isActive, createdAt } = this;
    return { id, email, firstName, lastName, role, isActive, createdAt };
  };

  // Define associations with other models
  User.associate = function(models) {
    User.hasMany(models.Post, {
      foreignKey: 'authorId',
      as: 'posts',
      onDelete: 'CASCADE',
    });
  };

  return User;
};
```

### Post Model

Create a related model to demonstrate associations and more complex queries.

```javascript
// src/models/post.model.js
module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Title is required',
        },
        len: {
          args: [3, 200],
          msg: 'Title must be between 3 and 200 characters',
        },
      },
    },
    slug: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    excerpt: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft',
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    metadata: {
      type: DataTypes.JSONB, // PostgreSQL JSONB for flexible metadata
      defaultValue: {},
    },
  }, {
    tableName: 'posts',
    timestamps: true,
    paranoid: true,
    indexes: [
      // Index for faster queries by status
      { fields: ['status'] },
      // Index for faster queries by author
      { fields: ['authorId'] },
      // Composite index for common query pattern
      { fields: ['status', 'publishedAt'] },
    ],
  });

  // Generate slug from title before validation
  Post.beforeValidate(async (post) => {
    if (post.title && (!post.slug || post.changed('title'))) {
      const baseSlug = post.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Ensure unique slug by appending timestamp if needed
      const existingPost = await Post.findOne({ where: { slug: baseSlug } });
      post.slug = existingPost ? `${baseSlug}-${Date.now()}` : baseSlug;
    }
  });

  // Set publishedAt when status changes to published
  Post.beforeUpdate(async (post) => {
    if (post.changed('status') && post.status === 'published' && !post.publishedAt) {
      post.publishedAt = new Date();
    }
  });

  // Instance method to increment view count
  Post.prototype.incrementViews = async function() {
    this.viewCount += 1;
    return this.save({ fields: ['viewCount'] });
  };

  // Define associations
  Post.associate = function(models) {
    Post.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'author',
    });
  };

  return Post;
};
```

## Database Migrations

Migrations track database schema changes over time, allowing you to version control your database structure and apply changes safely across environments.

### Creating Migrations

Generate migration files using the Sequelize CLI.

```bash
# Generate a migration for creating the users table
npx sequelize-cli migration:generate --name create-users
```

### Users Table Migration

Write migrations with both `up` and `down` methods to enable rolling back changes.

```javascript
// src/migrations/20260101000001-create-users.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'first_name',
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'last_name',
      },
      role: {
        type: Sequelize.ENUM('user', 'admin', 'moderator'),
        defaultValue: 'user',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'last_login_at',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'deleted_at',
      },
    });

    // Add index on email for faster lookups
    await queryInterface.addIndex('users', ['email']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  },
};
```

### Posts Table Migration

```javascript
// src/migrations/20260101000002-create-posts.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('posts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING(250),
        allowNull: false,
        unique: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      excerpt: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'archived'),
        defaultValue: 'draft',
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'published_at',
      },
      viewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'view_count',
      },
      authorId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'author_id',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'deleted_at',
      },
    });

    // Add indexes for common query patterns
    await queryInterface.addIndex('posts', ['status']);
    await queryInterface.addIndex('posts', ['author_id']);
    await queryInterface.addIndex('posts', ['status', 'published_at']);
    await queryInterface.addIndex('posts', ['slug']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('posts');
  },
};
```

### Running Migrations

Execute migrations using the Sequelize CLI commands.

```bash
# Run all pending migrations
npx sequelize-cli db:migrate

# Undo the last migration
npx sequelize-cli db:migrate:undo

# Undo all migrations
npx sequelize-cli db:migrate:undo:all

# Check migration status
npx sequelize-cli db:migrate:status
```

## Service Layer

The service layer contains business logic and database operations, keeping controllers thin and focused on HTTP concerns.

### User Service

```javascript
// src/services/user.service.js
const { User, Post, sequelize } = require('../models');
const { Op } = require('sequelize');

class UserService {
  // Find a user by their primary key (ID)
  async findById(id) {
    return User.findByPk(id, {
      include: [
        {
          model: Post,
          as: 'posts',
          where: { status: 'published' },
          required: false,
          limit: 5,
          order: [['publishedAt', 'DESC']],
        },
      ],
    });
  }

  // Find user by email with password included (for authentication)
  async findByEmailWithPassword(email) {
    return User.scope('withPassword').findOne({
      where: { email: email.toLowerCase() },
    });
  }

  // Create a new user with transaction for data integrity
  async create(userData) {
    const transaction = await sequelize.transaction();

    try {
      // Normalize email to lowercase
      userData.email = userData.email.toLowerCase();

      const user = await User.create(userData, { transaction });

      await transaction.commit();
      return user.toSafeObject();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Update user with partial data
  async update(id, updateData) {
    const user = await User.findByPk(id);

    if (!user) {
      return null;
    }

    // Only allow updating specific fields
    const allowedFields = ['firstName', 'lastName', 'password'];
    const filteredData = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    await user.update(filteredData);
    return user.toSafeObject();
  }

  // Soft delete a user (paranoid mode)
  async delete(id) {
    const user = await User.findByPk(id);

    if (!user) {
      return false;
    }

    await user.destroy();
    return true;
  }

  // List users with pagination, filtering, and sorting
  async list({ page = 1, limit = 10, search, role, sortBy = 'createdAt', order = 'DESC' }) {
    const offset = (page - 1) * limit;

    // Build dynamic where clause
    const where = {};

    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const { rows: users, count: total } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, order]],
      distinct: true,
    });

    return {
      users: users.map(user => user.toSafeObject()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Update last login timestamp
  async updateLastLogin(id) {
    await User.update(
      { lastLoginAt: new Date() },
      { where: { id } }
    );
  }
}

module.exports = new UserService();
```

### Post Service

```javascript
// src/services/post.service.js
const { Post, User, sequelize } = require('../models');
const { Op } = require('sequelize');

class PostService {
  // Find a post by ID with author details
  async findById(id) {
    const post = await Post.findByPk(id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    if (post) {
      // Increment view count asynchronously
      post.incrementViews().catch(console.error);
    }

    return post;
  }

  // Find a post by its URL slug
  async findBySlug(slug) {
    return Post.findOne({
      where: { slug, status: 'published' },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });
  }

  // Create a new post
  async create(postData, authorId) {
    const transaction = await sequelize.transaction();

    try {
      const post = await Post.create(
        { ...postData, authorId },
        { transaction }
      );

      await transaction.commit();

      return this.findById(post.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Update a post (only by its author)
  async update(id, updateData, authorId) {
    const post = await Post.findOne({
      where: { id, authorId },
    });

    if (!post) {
      return null;
    }

    // Prevent changing authorId
    delete updateData.authorId;

    await post.update(updateData);
    return this.findById(post.id);
  }

  // Delete a post (soft delete)
  async delete(id, authorId) {
    const post = await Post.findOne({
      where: { id, authorId },
    });

    if (!post) {
      return false;
    }

    await post.destroy();
    return true;
  }

  // List posts with pagination and filtering
  async list({
    page = 1,
    limit = 10,
    status,
    authorId,
    search,
    sortBy = 'createdAt',
    order = 'DESC',
  }) {
    const offset = (page - 1) * limit;
    const where = {};

    if (status) {
      where.status = status;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows: posts, count: total } = await Post.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      limit,
      offset,
      order: [[sortBy, order]],
      distinct: true,
    });

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Publish a post (change status and set publishedAt)
  async publish(id, authorId) {
    const post = await Post.findOne({
      where: { id, authorId, status: 'draft' },
    });

    if (!post) {
      return null;
    }

    await post.update({
      status: 'published',
      publishedAt: new Date(),
    });

    return this.findById(post.id);
  }

  // Get post statistics for a user
  async getAuthorStats(authorId) {
    const stats = await Post.findAll({
      where: { authorId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('viewCount')), 'totalViews'],
      ],
      group: ['status'],
      raw: true,
    });

    return stats;
  }
}

module.exports = new PostService();
```

## Controllers

Controllers handle HTTP requests, validate input, call services, and format responses.

### User Controller

```javascript
// src/controllers/user.controller.js
const userService = require('../services/user.service');

class UserController {
  // GET /api/users
  async list(req, res, next) {
    try {
      const { page, limit, search, role, sortBy, order } = req.query;

      const result = await userService.list({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search,
        role,
        sortBy,
        order,
      });

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/users/:id
  async getById(req, res, next) {
    try {
      const user = await userService.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/users
  async create(req, res, next) {
    try {
      const { email, password, firstName, lastName } = req.body;

      const user = await userService.create({
        email,
        password,
        firstName,
        lastName,
      });

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully',
      });
    } catch (error) {
      // Handle unique constraint violation
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          error: 'Email already exists',
        });
      }
      next(error);
    }
  }

  // PATCH /api/users/:id
  async update(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.body);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.json({
        success: true,
        data: user,
        message: 'User updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/users/:id
  async delete(req, res, next) {
    try {
      const deleted = await userService.delete(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
```

### Post Controller

```javascript
// src/controllers/post.controller.js
const postService = require('../services/post.service');

class PostController {
  // GET /api/posts
  async list(req, res, next) {
    try {
      const { page, limit, status, authorId, search, sortBy, order } = req.query;

      const result = await postService.list({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status,
        authorId,
        search,
        sortBy,
        order,
      });

      res.json({
        success: true,
        data: result.posts,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/posts/:id
  async getById(req, res, next) {
    try {
      const post = await postService.findById(req.params.id);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found',
        });
      }

      res.json({
        success: true,
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/posts/slug/:slug
  async getBySlug(req, res, next) {
    try {
      const post = await postService.findBySlug(req.params.slug);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found',
        });
      }

      res.json({
        success: true,
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/posts
  async create(req, res, next) {
    try {
      // Assumes req.user is set by authentication middleware
      const authorId = req.user?.id;

      if (!authorId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const post = await postService.create(req.body, authorId);

      res.status(201).json({
        success: true,
        data: post,
        message: 'Post created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/posts/:id
  async update(req, res, next) {
    try {
      const authorId = req.user?.id;
      const post = await postService.update(req.params.id, req.body, authorId);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found or unauthorized',
        });
      }

      res.json({
        success: true,
        data: post,
        message: 'Post updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/posts/:id
  async delete(req, res, next) {
    try {
      const authorId = req.user?.id;
      const deleted = await postService.delete(req.params.id, authorId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Post not found or unauthorized',
        });
      }

      res.json({
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/posts/:id/publish
  async publish(req, res, next) {
    try {
      const authorId = req.user?.id;
      const post = await postService.publish(req.params.id, authorId);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found, unauthorized, or already published',
        });
      }

      res.json({
        success: true,
        data: post,
        message: 'Post published successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PostController();
```

## Routes

Organize routes in separate files and combine them in a central router.

### User Routes

```javascript
// src/routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// List all users with pagination
router.get('/', userController.list);

// Get a single user by ID
router.get('/:id', userController.getById);

// Create a new user
router.post('/', userController.create);

// Update a user
router.patch('/:id', userController.update);

// Delete a user
router.delete('/:id', userController.delete);

module.exports = router;
```

### Post Routes

```javascript
// src/routes/post.routes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');

// List all posts
router.get('/', postController.list);

// Get post by slug (must be before /:id to avoid conflicts)
router.get('/slug/:slug', postController.getBySlug);

// Get post by ID
router.get('/:id', postController.getById);

// Create a new post
router.post('/', postController.create);

// Update a post
router.patch('/:id', postController.update);

// Delete a post
router.delete('/:id', postController.delete);

// Publish a draft post
router.post('/:id/publish', postController.publish);

module.exports = router;
```

### Route Index

```javascript
// src/routes/index.js
const express = require('express');
const router = express.Router();

const userRoutes = require('./user.routes');
const postRoutes = require('./post.routes');

// Mount routes
router.use('/users', userRoutes);
router.use('/posts', postRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
```

## Error Handling

Create a centralized error handling middleware to provide consistent error responses.

```javascript
// src/middleware/errorHandler.js
const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');

// Custom application error class
class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
function errorHandler(err, req, res, next) {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = null;

  // Handle Sequelize validation errors
  if (err instanceof ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle unique constraint errors
  if (err instanceof UniqueConstraintError) {
    statusCode = 409;
    code = 'DUPLICATE_ERROR';
    message = 'Resource already exists';
    details = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle foreign key constraint errors
  if (err instanceof ForeignKeyConstraintError) {
    statusCode = 400;
    code = 'REFERENCE_ERROR';
    message = 'Referenced resource not found';
  }

  // Log errors in development, log only critical errors in production
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  } else if (statusCode >= 500) {
    console.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: process.env.NODE_ENV === 'production' && statusCode >= 500
        ? 'Internal server error'
        : message,
      ...(details && { details }),
    },
  });
}

// Not found handler
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

module.exports = { AppError, errorHandler, notFoundHandler };
```

## Express Application Setup

Combine all components into the main application file.

```javascript
// src/app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { sequelize } = require('./models');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// Handle 404 for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Database connection and server startup
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync models in development (use migrations in production)
    if (process.env.NODE_ENV === 'development') {
      // await sequelize.sync({ alter: true }); // Uncomment for auto-sync
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing database connections...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing database connections...');
  await sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app;
```

## Advanced Queries

### Transactions for Complex Operations

Use transactions when multiple database operations must succeed or fail together.

```javascript
// src/services/order.service.js
const { Order, OrderItem, Product, sequelize } = require('../models');

class OrderService {
  async createOrder(userId, items) {
    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // Create the order
      const order = await Order.create(
        { userId, status: 'pending' },
        { transaction }
      );

      // Process each item
      for (const item of items) {
        // Check product availability
        const product = await Product.findByPk(item.productId, {
          lock: transaction.LOCK.UPDATE, // Lock row for update
          transaction,
        });

        if (!product || product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }

        // Create order item
        await OrderItem.create(
          {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: product.price,
          },
          { transaction }
        );

        // Reduce product stock
        await product.decrement('stock', {
          by: item.quantity,
          transaction,
        });
      }

      // Calculate order total
      const total = items.reduce((sum, item, index) => {
        // In real code, you would track prices from the loop above
        return sum + (item.price * item.quantity);
      }, 0);

      await order.update({ total }, { transaction });

      // Commit the transaction
      await transaction.commit();

      return order;
    } catch (error) {
      // Rollback on any error
      await transaction.rollback();
      throw error;
    }
  }
}
```

### Raw Queries for Complex Operations

Sometimes raw SQL is more efficient for complex queries.

```javascript
// Using raw queries for complex aggregations
async function getPostAnalytics(authorId) {
  const [results] = await sequelize.query(`
    SELECT
      DATE_TRUNC('month', published_at) as month,
      COUNT(*) as post_count,
      SUM(view_count) as total_views,
      AVG(view_count) as avg_views
    FROM posts
    WHERE author_id = :authorId
      AND status = 'published'
      AND published_at IS NOT NULL
    GROUP BY DATE_TRUNC('month', published_at)
    ORDER BY month DESC
    LIMIT 12
  `, {
    replacements: { authorId },
    type: sequelize.QueryTypes.SELECT,
  });

  return results;
}
```

### Eager Loading Optimization

Optimize queries by loading only the data you need.

```javascript
// Avoid N+1 queries with proper eager loading
async function getPostsWithAuthors() {
  // Bad: This causes N+1 queries
  // const posts = await Post.findAll();
  // for (const post of posts) {
  //   const author = await post.getAuthor();
  // }

  // Good: Single query with JOIN
  const posts = await Post.findAll({
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'firstName', 'lastName'], // Only needed fields
      },
    ],
    attributes: ['id', 'title', 'slug', 'publishedAt'], // Only needed fields
    where: { status: 'published' },
    order: [['publishedAt', 'DESC']],
    limit: 20,
  });

  return posts;
}
```

## Request Flow Diagram

Understanding how a request flows through the application helps with debugging and optimization.

```mermaid
sequenceDiagram
    participant C as Client
    participant E as Express
    participant M as Middleware
    participant R as Router
    participant CT as Controller
    participant S as Service
    participant SQ as Sequelize
    participant DB as Database

    C->>E: HTTP Request
    E->>M: helmet, cors, json parser
    M->>R: Route matching
    R->>CT: Call controller method
    CT->>S: Call service method
    S->>SQ: Build query
    SQ->>DB: Execute SQL
    DB-->>SQ: Return results
    SQ-->>S: Return model instances
    S-->>CT: Return data
    CT-->>E: Format response
    E-->>C: JSON Response
```

## Best Practices Summary

### Model Design
- Use UUIDs for primary keys in distributed systems
- Define validations at the model level for data integrity
- Use scopes for reusable query conditions
- Implement hooks for automatic data transformation
- Use virtual fields for computed properties

### Query Optimization
- Always specify `attributes` to limit selected columns
- Use `include` for eager loading related data
- Add database indexes for frequently queried columns
- Use `findAndCountAll` for pagination instead of separate queries
- Implement connection pooling for production

### Error Handling
- Create custom error classes for different error types
- Handle Sequelize errors specifically for better error messages
- Log errors with context for debugging
- Return consistent error response format

### Security
- Never expose raw Sequelize errors to clients
- Validate and sanitize all user input
- Use parameterized queries to prevent SQL injection
- Implement rate limiting for API endpoints
- Use transactions for data integrity

### Project Structure
- Separate concerns with layers (routes, controllers, services, models)
- Use environment variables for configuration
- Implement graceful shutdown handling
- Use migrations for all schema changes
- Write seeders for test and development data

## Summary

| Component | Purpose |
|-----------|---------|
| **Models** | Define data structure, validations, and associations |
| **Migrations** | Version control database schema changes |
| **Services** | Contain business logic and database operations |
| **Controllers** | Handle HTTP request/response logic |
| **Routes** | Define API endpoints and middleware |
| **Error Handler** | Provide consistent error responses |

Building database-driven Express applications with Sequelize requires thoughtful architecture and adherence to best practices. By separating concerns into distinct layers, using proper error handling, and optimizing queries, you create applications that are maintainable, scalable, and performant. The patterns shown in this guide provide a solid foundation for building production-ready Node.js APIs.
