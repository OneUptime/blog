# How to Use Sequelize ORM with Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Sequelize, ORM, Database, SQL

Description: Learn how to use Sequelize ORM with Node.js for database operations including models, migrations, associations, queries, and transactions with PostgreSQL, MySQL, or SQLite.

---

Sequelize is a powerful ORM for Node.js that supports PostgreSQL, MySQL, MariaDB, SQLite, and SQL Server. It provides a clean API for database operations with support for migrations, associations, and transactions.

## Installation

```bash
# Sequelize core
npm install sequelize

# Database driver (choose one)
npm install pg pg-hstore     # PostgreSQL
npm install mysql2           # MySQL
npm install mariadb          # MariaDB
npm install sqlite3          # SQLite
npm install tedious          # Microsoft SQL Server
```

## Connection Setup

### Basic Connection

```javascript
const { Sequelize } = require('sequelize');

// PostgreSQL
const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'postgres',
});

// MySQL
const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'mysql',
});

// SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
});

// Connection URI
const sequelize = new Sequelize('postgres://user:pass@localhost:5432/dbname');
```

### Connection Options

```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  
  // Connection pool
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  
  // Logging
  logging: console.log,  // or false to disable
  logging: (msg) => logger.debug(msg),
  
  // Timezone
  timezone: '+00:00',
  
  // SSL
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});
```

### Test Connection

```javascript
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Connection established successfully.');
  } catch (error) {
    console.error('Unable to connect:', error);
  }
}

testConnection();
```

## Defining Models

### Basic Model

```javascript
const { DataTypes } = require('sequelize');

const User = sequelize.define('User', {
  // Primary key (auto-generated if not specified)
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  
  // Required field
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  
  // With default value
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user',
  },
  
  // Virtual field (not stored in DB)
  fullName: {
    type: DataTypes.VIRTUAL,
    get() {
      return `${this.firstName} ${this.lastName}`;
    },
  },
}, {
  tableName: 'users',      // Custom table name
  timestamps: true,        // createdAt, updatedAt
  paranoid: true,          // Soft deletes (deletedAt)
  underscored: true,       // snake_case columns
});
```

### Data Types

```javascript
const { DataTypes } = require('sequelize');

const Product = sequelize.define('Product', {
  // String types
  name: DataTypes.STRING,           // VARCHAR(255)
  description: DataTypes.TEXT,      // TEXT
  sku: DataTypes.STRING(50),        // VARCHAR(50)
  
  // Number types
  price: DataTypes.DECIMAL(10, 2),  // DECIMAL
  quantity: DataTypes.INTEGER,       // INTEGER
  rating: DataTypes.FLOAT,          // FLOAT
  
  // Boolean
  isActive: DataTypes.BOOLEAN,
  
  // Date/Time
  releaseDate: DataTypes.DATE,      // DATETIME
  time: DataTypes.TIME,
  dateOnly: DataTypes.DATEONLY,
  
  // JSON
  metadata: DataTypes.JSON,
  
  // Arrays (PostgreSQL only)
  tags: DataTypes.ARRAY(DataTypes.STRING),
  
  // Enum
  status: DataTypes.ENUM('draft', 'published', 'archived'),
  
  // UUID
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
});
```

### Model Methods

```javascript
const User = sequelize.define('User', {
  email: DataTypes.STRING,
  password: DataTypes.STRING,
});

// Instance method
User.prototype.checkPassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Class method
User.findByEmail = async function(email) {
  return this.findOne({ where: { email } });
};

// Hooks
User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
});

// Usage
const user = await User.findByEmail('test@example.com');
const isValid = await user.checkPassword('secret');
```

## CRUD Operations

### Create

```javascript
// Create single record
const user = await User.create({
  email: 'john@example.com',
  name: 'John Doe',
});

// Bulk create
const users = await User.bulkCreate([
  { email: 'user1@example.com', name: 'User 1' },
  { email: 'user2@example.com', name: 'User 2' },
]);

// Create with specific fields only
const user = await User.create(
  { email: 'jane@example.com', name: 'Jane', role: 'admin' },
  { fields: ['email', 'name'] }  // Ignore 'role'
);
```

### Read

```javascript
// Find by primary key
const user = await User.findByPk(1);

// Find one
const user = await User.findOne({
  where: { email: 'john@example.com' },
});

// Find all
const users = await User.findAll();

// Find with conditions
const activeUsers = await User.findAll({
  where: {
    status: 'active',
    role: 'user',
  },
});

// Find or create
const [user, created] = await User.findOrCreate({
  where: { email: 'john@example.com' },
  defaults: { name: 'John Doe' },
});
```

### Update

```javascript
// Update instance
const user = await User.findByPk(1);
user.name = 'Updated Name';
await user.save();

// Update with object
await user.update({ name: 'New Name', role: 'admin' });

// Bulk update
const [affectedRows] = await User.update(
  { status: 'inactive' },
  { where: { lastLogin: { [Op.lt]: new Date('2024-01-01') } } }
);
```

### Delete

```javascript
// Delete instance
const user = await User.findByPk(1);
await user.destroy();

// Bulk delete
await User.destroy({
  where: { status: 'inactive' },
});

// Truncate table
await User.truncate();

// With paranoid (soft delete), force delete
await user.destroy({ force: true });
```

## Query Operators

```javascript
const { Op } = require('sequelize');

// Comparison operators
const users = await User.findAll({
  where: {
    age: { [Op.gt]: 18 },      // > 18
    age: { [Op.gte]: 18 },     // >= 18
    age: { [Op.lt]: 65 },      // < 65
    age: { [Op.lte]: 65 },     // <= 65
    age: { [Op.ne]: 25 },      // != 25
    age: { [Op.between]: [18, 65] },
    status: { [Op.in]: ['active', 'pending'] },
    status: { [Op.notIn]: ['banned'] },
    name: { [Op.like]: '%john%' },
    name: { [Op.iLike]: '%JOHN%' },  // Case insensitive (PostgreSQL)
    name: { [Op.startsWith]: 'J' },
    name: { [Op.endsWith]: 'son' },
    description: { [Op.is]: null },
    description: { [Op.not]: null },
  },
});

// Logical operators
const users = await User.findAll({
  where: {
    [Op.and]: [
      { status: 'active' },
      { role: 'admin' },
    ],
    [Op.or]: [
      { age: { [Op.gt]: 30 } },
      { experience: { [Op.gt]: 5 } },
    ],
  },
});
```

## Associations

### One-to-One

```javascript
const User = sequelize.define('User', {
  name: DataTypes.STRING,
});

const Profile = sequelize.define('Profile', {
  bio: DataTypes.TEXT,
});

// User has one Profile
User.hasOne(Profile, { foreignKey: 'userId' });
Profile.belongsTo(User, { foreignKey: 'userId' });

// Usage
const user = await User.findByPk(1, {
  include: Profile,
});
console.log(user.Profile.bio);
```

### One-to-Many

```javascript
const User = sequelize.define('User', {
  name: DataTypes.STRING,
});

const Post = sequelize.define('Post', {
  title: DataTypes.STRING,
  content: DataTypes.TEXT,
});

// User has many Posts
User.hasMany(Post, { foreignKey: 'authorId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

// Usage
const user = await User.findByPk(1, {
  include: { model: Post, as: 'posts' },
});

const post = await Post.findByPk(1, {
  include: { model: User, as: 'author' },
});
```

### Many-to-Many

```javascript
const Post = sequelize.define('Post', {
  title: DataTypes.STRING,
});

const Tag = sequelize.define('Tag', {
  name: DataTypes.STRING,
});

// Junction table
const PostTag = sequelize.define('PostTag', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
}, { timestamps: false });

// Many-to-Many
Post.belongsToMany(Tag, { through: PostTag });
Tag.belongsToMany(Post, { through: PostTag });

// Usage
const post = await Post.findByPk(1, {
  include: Tag,
});

// Add tags
const post = await Post.findByPk(1);
const tag = await Tag.findByPk(1);
await post.addTag(tag);
await post.addTags([tag1, tag2, tag3]);
await post.setTags([tag1, tag2]);
await post.removeTag(tag);
```

## Eager Loading

```javascript
// Include association
const users = await User.findAll({
  include: [
    { model: Profile },
    { model: Post, as: 'posts' },
  ],
});

// Nested includes
const posts = await Post.findAll({
  include: [
    {
      model: User,
      as: 'author',
      include: [Profile],
    },
    { model: Tag },
  ],
});

// Conditional includes
const users = await User.findAll({
  include: {
    model: Post,
    as: 'posts',
    where: { status: 'published' },
    required: false,  // LEFT JOIN (include users without posts)
  },
});

// Select specific attributes
const users = await User.findAll({
  attributes: ['id', 'name'],
  include: {
    model: Post,
    as: 'posts',
    attributes: ['title', 'createdAt'],
  },
});
```

## Migrations

### Setup Sequelize CLI

```bash
npm install --save-dev sequelize-cli
npx sequelize-cli init
```

This creates:
- `config/config.json` - Database configuration
- `models/` - Model definitions
- `migrations/` - Migration files
- `seeders/` - Seed files

### Create Migration

```bash
npx sequelize-cli migration:generate --name create-users
```

```javascript
// migrations/YYYYMMDDHHMMSS-create-users.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  },
};
```

### Run Migrations

```bash
# Run all pending migrations
npx sequelize-cli db:migrate

# Undo last migration
npx sequelize-cli db:migrate:undo

# Undo all migrations
npx sequelize-cli db:migrate:undo:all
```

### Add Column Migration

```javascript
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'role', {
      type: Sequelize.STRING,
      defaultValue: 'user',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'role');
  },
};
```

## Transactions

```javascript
// Managed transaction (auto-commit/rollback)
const result = await sequelize.transaction(async (t) => {
  const user = await User.create({ name: 'John' }, { transaction: t });
  await Profile.create({ userId: user.id, bio: 'Hello' }, { transaction: t });
  return user;
});

// Unmanaged transaction
const t = await sequelize.transaction();
try {
  const user = await User.create({ name: 'John' }, { transaction: t });
  await Profile.create({ userId: user.id }, { transaction: t });
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

## Raw Queries

```javascript
// Raw SELECT
const [results, metadata] = await sequelize.query(
  'SELECT * FROM Users WHERE status = ?',
  {
    replacements: ['active'],
    type: sequelize.QueryTypes.SELECT,
  }
);

// Named replacements
const users = await sequelize.query(
  'SELECT * FROM Users WHERE status = :status AND role = :role',
  {
    replacements: { status: 'active', role: 'admin' },
    type: sequelize.QueryTypes.SELECT,
  }
);
```

## Summary

| Operation | Method |
|-----------|--------|
| Create | `Model.create()`, `Model.bulkCreate()` |
| Read | `findByPk()`, `findOne()`, `findAll()` |
| Update | `instance.save()`, `Model.update()` |
| Delete | `instance.destroy()`, `Model.destroy()` |
| Association | `include` in queries |
| Transaction | `sequelize.transaction()` |

Best practices:
- Use migrations for schema changes
- Define associations in a central place
- Use transactions for related operations
- Enable logging only in development
- Use connection pooling in production
- Validate data at model level
