# How to Use MySQL with Node.js mysql2 Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Node.js, mysql2, JavaScript, Database Integration

Description: Learn how to connect to MySQL from Node.js using the mysql2 library, including connection pools, prepared statements, and async/await patterns.

---

## What is mysql2

`mysql2` is a fast MySQL driver for Node.js that supports Promises, async/await, connection pools, prepared statements, and streaming. It is the successor to the `mysql` package and is the recommended choice for new Node.js MySQL projects.

## Installation

```bash
npm install mysql2
```

## Basic Connection

```javascript
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'your_user',
  password: 'your_password',
  database: 'your_database'
});

connection.connect((err) => {
  if (err) {
    console.error('Connection error:', err);
    return;
  }
  console.log('Connected to MySQL');
});

connection.end();
```

## Using Promises and Async/Await

```javascript
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'your_user',
    password: 'your_password',
    database: 'your_database'
  });

  const [rows] = await connection.execute('SELECT VERSION() AS version');
  console.log('MySQL version:', rows[0].version);

  await connection.end();
}

main().catch(console.error);
```

## Creating a Connection Pool

For production, use a connection pool to reuse connections:

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'your_user',
  password: 'your_password',
  database: 'your_database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
```

## Inserting Data

Use `execute()` for prepared statements with `?` placeholders:

```javascript
async function createEmployee(name, department, salary) {
  const [result] = await pool.execute(
    'INSERT INTO employees (name, department, salary) VALUES (?, ?, ?)',
    [name, department, salary]
  );
  console.log('Insert ID:', result.insertId);
  return result.insertId;
}

await createEmployee('Alice Smith', 'Engineering', 95000);
```

## Querying Data

```javascript
async function getEmployeesByDepartment(department) {
  const [rows] = await pool.execute(
    'SELECT id, name, salary FROM employees WHERE department = ?',
    [department]
  );
  return rows;
}

const engineers = await getEmployeesByDepartment('Engineering');
engineers.forEach(emp => console.log(emp.name, emp.salary));
```

## Updating and Deleting

```javascript
// Update
async function updateSalary(id, newSalary) {
  const [result] = await pool.execute(
    'UPDATE employees SET salary = ? WHERE id = ?',
    [newSalary, id]
  );
  console.log('Rows affected:', result.affectedRows);
}

// Delete
async function deleteEmployee(id) {
  const [result] = await pool.execute(
    'DELETE FROM employees WHERE id = ?',
    [id]
  );
  console.log('Rows deleted:', result.affectedRows);
}
```

## Transactions

```javascript
async function transferFunds(fromId, toId, amount) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [amount, fromId]
    );
    await conn.execute(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [amount, toId]
    );

    await conn.commit();
    console.log('Transfer successful');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
```

## Streaming Large Result Sets

```javascript
const mysql = require('mysql2');

const connection = mysql.createConnection({ /* config */ });

const stream = connection.query('SELECT * FROM large_table').stream();

stream.on('data', (row) => {
  console.log(row);
});

stream.on('end', () => {
  console.log('Done streaming');
  connection.end();
});
```

## Summary

`mysql2` is the recommended MySQL driver for Node.js, offering native Promise support, connection pooling, and prepared statements. Always use `execute()` with `?` placeholders rather than string concatenation for parameterized queries. Use connection pools with `pool.getConnection()` and `conn.release()` for transaction handling in production applications.
