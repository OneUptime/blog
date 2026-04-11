# How to Use MySQL Workbench Reverse Engineering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Workbench, Reverse Engineering, EER, Documentation

Description: Learn how to use MySQL Workbench Reverse Engineering to generate EER diagrams from an existing MySQL database for documentation and schema analysis.

---

## Introduction

Reverse Engineering in MySQL Workbench reads an existing MySQL database and generates a visual EER (Enhanced Entity-Relationship) diagram from it. This is invaluable for understanding inherited databases, creating documentation, auditing schema design, and planning migrations. It can reverse engineer from a live connection or from a SQL DDL script file.

## Reverse Engineering from a Live Server

With a connection established in Workbench:

```text
Database > Reverse Engineer...
```

The wizard walks through several steps.

## Step 1 - Connection Selection

Select the MySQL connection to the target server and click **Continue**.

## Step 2 - Schema Selection

Choose which schemas to reverse engineer:

```text
Available Schemas:
[x] ecommerce
[ ] test
[ ] information_schema
```

Select one or more schemas and click **Next**.

## Step 3 - Object Selection

Choose which object types to include in the EER model:

```text
[x] Tables
[x] Views
[x] Stored Procedures
[x] Functions
[x] Triggers
```

Select **Show Filter** to include or exclude specific tables.

## Step 4 - Review Results

Workbench retrieves all DDL from the server and parses it. Any parsing errors appear here. Click **Continue** to generate the diagram.

## Step 5 - EER Diagram

The resulting EER diagram shows all selected tables as entities, with:
- Columns listed inside each entity box
- Primary key columns marked with a key icon
- Foreign key relationships drawn as connecting lines with cardinality notation

Tables may initially overlap - drag them to arrange logically.

## Reverse Engineering from a SQL Script

To reverse engineer from an existing `.sql` file instead of a live server:

```text
File > Import > Reverse Engineer MySQL Create Script...
```

Select the `.sql` file. Workbench parses the DDL and generates an EER model from it:

```sql
-- Example input
CREATE TABLE customers (
  id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE orders (
  id INT NOT NULL AUTO_INCREMENT,
  customer_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

Workbench generates entities for both tables and draws the `customers -> orders` relationship.

## Cleaning Up the Diagram

After reverse engineering, use these layout tools to improve readability:

- **Arrange > Auto-Layout** - automatically repositions tables to reduce overlaps
- Manual drag-and-drop to group related tables
- **View > Zoom** - adjust zoom level for large schemas

## Saving the Model

Save the generated model as a `.mwb` file:

```text
File > Save Model As > ecommerce_reversed.mwb
```

## Exporting the Diagram

Export the diagram as an image for documentation:

```text
File > Export > Export as PNG / PDF
```

Or print it:

```text
File > Print to File
```

## Comparing with Forward Engineering

Reverse Engineering and Forward Engineering work together:

```text
Reverse Engineer existing DB -> Edit model -> Forward Engineer changes
```

This workflow lets you use Workbench as a schema management tool for databases you didn't originally design.

## Summary

MySQL Workbench Reverse Engineering provides a fast way to generate visual EER diagrams from existing MySQL databases. Whether working with a legacy system, onboarding to a new project, or planning a refactor, the reverse engineering wizard gives you an accurate visual representation of the schema in minutes, complete with relationships, indexes, and stored objects.
