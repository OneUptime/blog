# How to View and Manage Documents in MongoDB Compass

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compass, Document, CRUD, GUI

Description: Learn how to view, insert, edit, clone, and delete MongoDB documents using the Compass GUI without writing shell commands.

---

## The Documents Tab

MongoDB Compass provides a Documents tab for each collection that supports full CRUD operations through a visual interface. You can switch between List, Table, and JSON views depending on the task.

## Viewing Documents

Connect to a cluster or local deployment, select a database, and click a collection. The Documents tab loads the first 20 documents by default.

Three view modes are available:

- **List view** - shows document fields indented like a tree
- **Table view** - shows fields as columns, useful for flat documents
- **JSON view** - shows raw JSON with syntax highlighting

Toggle between them using the icons in the top right of the Documents tab.

## Filtering Documents

Use the Filter bar to display only matching documents:

```json
{ "status": "pending", "amount": { "$gt": 100 } }
```

Press Enter or click Find to apply the filter.

## Inserting a Single Document

Click the Add Data button and choose Insert Document. A JSON editor appears pre-filled with an empty document:

```json
{
  "_id": { "$oid": "..." },
  "name": "New Product",
  "price": 29.99,
  "category": "tools",
  "createdAt": { "$date": "2026-03-31T00:00:00.000Z" }
}
```

Edit the fields and click Insert to save.

## Inserting Multiple Documents

Choose Import JSON or CSV from the Add Data menu to bulk insert documents. For JSON, the file must contain either a JSON array or newline-delimited JSON objects:

```json
[
  { "name": "Item A", "qty": 10 },
  { "name": "Item B", "qty": 25 }
]
```

## Editing a Document

Hover over any document to reveal the edit (pencil) icon. Click it to enter edit mode, where fields become editable inline. Compass validates JSON syntax as you type and highlights errors.

After making changes, click the Update button to save or Revert to discard.

## Editing in JSON Mode

For complex nested documents, click the `{}` icon while in edit mode to switch to a full JSON editor:

```json
{
  "_id": { "$oid": "65abc..." },
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "zip": "12345"
  },
  "tags": ["premium", "verified"]
}
```

## Cloning a Document

To create a new document based on an existing one, hover over the document and click the Clone icon. Compass opens the Insert dialog with the document pre-populated - edit the fields you want to change, then click Insert.

## Deleting a Document

Hover over a document and click the trash icon. Compass asks for confirmation before deleting.

To delete multiple documents matching a filter, apply the filter first to verify scope, then use the embedded mongosh shell in Compass to run `db.collection.deleteMany({ filter })` - bulk deletes are not available through the Compass Documents UI.

## Copying a Document Value

Right-click any field value in List view to copy it to the clipboard as a string or as a MongoDB Extended JSON snippet. This is handy for constructing queries based on actual data.

## Using Table View for Flat Collections

Table view is particularly useful for collections with consistent flat schemas. Each field becomes a column, and you can click column headers to sort. Inline editing works the same as List view.

## Summary

Compass makes document management accessible without the shell. Use List view for navigating nested documents, Table view for flat collections, and the JSON editor mode for complex edits. Insert documents via the GUI or import files for bulk operations. All changes are reflected immediately, making Compass a practical tool for both development and production data inspection.
