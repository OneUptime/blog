# How to Import Data from Excel into MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Import, Excel, Python, Data Migration

Description: Learn how to import Excel spreadsheet data into MongoDB using Python with openpyxl and pymongo, handling type conversion and bulk insertion for large files.

---

Importing Excel data into MongoDB is a common task when migrating legacy datasets or integrating with spreadsheet-based workflows. Python's `openpyxl` library reads `.xlsx` files, while `pymongo` handles the MongoDB insertion, making the combination straightforward to implement.

## Prerequisites

Install the required libraries:

```bash
pip install openpyxl pymongo
```

## Reading an Excel File with openpyxl

```python
import openpyxl

workbook = openpyxl.load_workbook("products.xlsx")
sheet = workbook.active

# Print column headers (first row)
headers = [cell.value for cell in sheet[1]]
print(headers)  # ['SKU', 'Name', 'Price', 'Stock', 'Category']
```

## Converting Rows to Dictionaries

```python
def excel_to_dicts(filename, sheet_name=None):
    wb = openpyxl.load_workbook(filename, read_only=True, data_only=True)
    ws = wb[sheet_name] if sheet_name else wb.active

    rows = ws.iter_rows(values_only=True)
    headers = [str(h) for h in next(rows)]

    documents = []
    for row in rows:
        doc = {}
        for header, value in zip(headers, row):
            if value is not None:
                doc[header] = value
        if doc:  # skip empty rows
            documents.append(doc)

    wb.close()
    return documents
```

## Type Conversion for MongoDB

Excel cells may contain mixed types. Clean and coerce them before insertion:

```python
def clean_document(doc):
    cleaned = {}
    for key, value in doc.items():
        # Strip whitespace from strings
        if isinstance(value, str):
            value = value.strip()
            if value == "":
                continue

        # Convert numeric strings
        if isinstance(value, str):
            try:
                value = float(value)
                if value.is_integer():
                    value = int(value)
            except ValueError:
                pass

        cleaned[key] = value
    return cleaned
```

## Bulk Inserting into MongoDB

Use `insert_many` with ordered=False for maximum throughput:

```python
from pymongo import MongoClient
from pymongo.errors import BulkWriteError

def import_excel_to_mongodb(filename, db_name, collection_name, batch_size=1000):
    client = MongoClient("mongodb://localhost:27017")
    db = client[db_name]
    collection = db[collection_name]

    documents = excel_to_dicts(filename)
    cleaned_docs = [clean_document(d) for d in documents]

    total_inserted = 0
    for i in range(0, len(cleaned_docs), batch_size):
        batch = cleaned_docs[i:i + batch_size]
        try:
            result = collection.insert_many(batch, ordered=False)
            total_inserted += len(result.inserted_ids)
            print(f"Inserted batch {i // batch_size + 1}: {len(result.inserted_ids)} documents")
        except BulkWriteError as e:
            total_inserted += e.details['nInserted']
            print(f"Batch error: {e.details['nInserted']} inserted, {len(e.details['writeErrors'])} errors")

    print(f"Total inserted: {total_inserted}")
    client.close()
```

## Handling Multiple Sheets

```python
def import_all_sheets(filename, db_name):
    wb = openpyxl.load_workbook(filename, read_only=True, data_only=True)
    client = MongoClient("mongodb://localhost:27017")
    db = client[db_name]

    for sheet_name in wb.sheetnames:
        print(f"Processing sheet: {sheet_name}")
        docs = excel_to_dicts(filename, sheet_name=sheet_name)
        if docs:
            collection_name = sheet_name.lower().replace(" ", "_")
            db[collection_name].insert_many(docs, ordered=False)
            print(f"  Inserted {len(docs)} documents into {collection_name}")

    wb.close()
    client.close()
```

## Running the Import

```python
if __name__ == "__main__":
    import_excel_to_mongodb(
        filename="products.xlsx",
        db_name="myapp",
        collection_name="products",
        batch_size=500
    )
```

## Summary

Importing Excel data into MongoDB with Python involves three steps: reading the spreadsheet with `openpyxl`, cleaning and type-converting the rows into dictionaries, and bulk-inserting them with `pymongo`. Batching the inserts prevents memory issues with large files, and using `ordered=False` maximizes throughput by allowing MongoDB to continue on individual document errors. For very large Excel files, use `read_only=True` in `load_workbook` to stream rows without loading the entire file into memory.
