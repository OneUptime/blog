# How to Write and Execute Stored Procedures in Azure Cosmos DB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, Stored Procedures, JavaScript, Server-Side Programming, Transactions

Description: Learn how to write, register, and execute stored procedures in Azure Cosmos DB for atomic multi-document operations using server-side JavaScript.

---

Stored procedures in Azure Cosmos DB let you run JavaScript directly on the database server. They execute within a single partition, and all operations within a stored procedure are wrapped in a transaction. If anything fails, the entire operation rolls back. This makes stored procedures the only way to get ACID transactions across multiple documents in Cosmos DB.

## Why Use Stored Procedures?

There are a few specific scenarios where stored procedures shine:

- **Multi-document transactions**: When you need to update multiple documents atomically (all succeed or all fail)
- **Reducing network round trips**: Instead of multiple reads and writes from your application, do it all in one call
- **Batch operations**: Processing many documents in a single server-side operation
- **Business logic enforcement**: Ensuring certain rules are always applied at the database level

However, stored procedures have limitations you should know about:

- They execute within a single logical partition only
- They are written in JavaScript (no other languages)
- They have a bounded execution time (currently 5 seconds)
- Debugging is harder compared to application code

## Writing Your First Stored Procedure

Stored procedures are JavaScript functions that receive a context object for interacting with the container. Here is a simple example that creates a document:

```javascript
// A simple stored procedure that creates a new document
// The function receives the document to create as a parameter
function createDocument(doc) {
    // Get a reference to the container
    var context = getContext();
    var container = context.getCollection();
    var response = context.getResponse();

    // Set a default timestamp if not provided
    if (!doc.createdAt) {
        doc.createdAt = new Date().toISOString();
    }

    // Create the document in the container
    // The callback handles the result or error
    var accepted = container.createDocument(
        container.getSelfLink(),
        doc,
        function (err, createdDoc) {
            if (err) throw new Error("Error creating document: " + err.message);
            // Return the created document in the response
            response.setBody(createdDoc);
        }
    );

    // If the request was not accepted (throttled), throw an error
    if (!accepted) {
        throw new Error("Document creation was not accepted. Check RU availability.");
    }
}
```

## Registering a Stored Procedure

You can register stored procedures through the Azure Portal, Azure CLI, or the SDK.

### Using Azure Portal

1. Navigate to your Cosmos DB account
2. Open the Data Explorer
3. Select your database and container
4. Click on "Stored Procedures"
5. Click "New Stored Procedure"
6. Enter an ID and paste the JavaScript code
7. Click Save

### Using the .NET SDK

```csharp
// Register a stored procedure using the .NET SDK
CosmosClient client = new CosmosClient(endpoint, key);
Container container = client.GetContainer("mydb", "mycontainer");

// Read the stored procedure JavaScript from a file
string sprocBody = File.ReadAllText("createDocument.js");

// Create the stored procedure definition
StoredProcedureProperties sprocProperties = new StoredProcedureProperties
{
    Id = "createDocument",
    Body = sprocBody
};

// Register it with the container
StoredProcedureResponse response = await container.Scripts.CreateStoredProcedureAsync(sprocProperties);
Console.WriteLine($"Stored procedure created: {response.Resource.Id}");
```

### Using Azure CLI

```bash
# Register a stored procedure from a JavaScript file
az cosmosdb sql stored-procedure create \
    --account-name myCosmosAccount \
    --database-name mydb \
    --container-name mycontainer \
    --name createDocument \
    --resource-group myResourceGroup \
    --body @createDocument.js
```

## Executing a Stored Procedure

When executing a stored procedure, you must specify the partition key value. The stored procedure can only access documents within that partition.

```csharp
// Execute the stored procedure with parameters
// The partition key determines which partition the sproc runs in
Container container = client.GetContainer("mydb", "mycontainer");

// The document to create (must have the partition key field)
dynamic newDoc = new {
    id = "doc-123",
    customerId = "cust-456",
    name = "New Order",
    total = 99.99
};

// Execute the stored procedure
// Parameters are passed as an array
StoredProcedureExecuteResponse<dynamic> result =
    await container.Scripts.ExecuteStoredProcedureAsync<dynamic>(
        storedProcedureId: "createDocument",
        partitionKey: new PartitionKey("cust-456"),
        parameters: new dynamic[] { newDoc }
    );

Console.WriteLine($"Created document: {result.Resource}");
Console.WriteLine($"Request charge: {result.RequestCharge} RUs");
```

## Multi-Document Transaction Example

Here is a more practical example - a stored procedure that transfers a balance between two accounts atomically:

```javascript
// Transfer balance between two accounts in the same partition
// Both accounts must have the same partition key value
function transferBalance(fromAccountId, toAccountId, amount) {
    var context = getContext();
    var container = context.getCollection();
    var response = context.getResponse();

    // Read the source account
    var filterFrom = 'SELECT * FROM c WHERE c.id = "' + fromAccountId + '"';
    var acceptedFrom = container.queryDocuments(
        container.getSelfLink(),
        filterFrom,
        function (err, docs) {
            if (err) throw new Error("Error reading source account: " + err.message);
            if (docs.length === 0) throw new Error("Source account not found");

            var fromAccount = docs[0];

            // Check if sufficient balance exists
            if (fromAccount.balance < amount) {
                throw new Error("Insufficient balance. Available: " + fromAccount.balance);
            }

            // Read the destination account
            var filterTo = 'SELECT * FROM c WHERE c.id = "' + toAccountId + '"';
            var acceptedTo = container.queryDocuments(
                container.getSelfLink(),
                filterTo,
                function (err, docs) {
                    if (err) throw new Error("Error reading destination account: " + err.message);
                    if (docs.length === 0) throw new Error("Destination account not found");

                    var toAccount = docs[0];

                    // Update balances
                    fromAccount.balance -= amount;
                    toAccount.balance += amount;

                    // Save the source account
                    var acceptReplace1 = container.replaceDocument(
                        fromAccount._self,
                        fromAccount,
                        function (err) {
                            if (err) throw new Error("Error updating source: " + err.message);

                            // Save the destination account
                            var acceptReplace2 = container.replaceDocument(
                                toAccount._self,
                                toAccount,
                                function (err) {
                                    if (err) throw new Error("Error updating destination: " + err.message);

                                    // Return the result
                                    response.setBody({
                                        fromBalance: fromAccount.balance,
                                        toBalance: toAccount.balance,
                                        transferred: amount
                                    });
                                }
                            );
                            if (!acceptReplace2) throw new Error("Replace destination not accepted");
                        }
                    );
                    if (!acceptReplace1) throw new Error("Replace source not accepted");
                }
            );
            if (!acceptedTo) throw new Error("Query destination not accepted");
        }
    );
    if (!acceptedFrom) throw new Error("Query source not accepted");
}
```

Execute this transfer:

```csharp
// Execute the balance transfer stored procedure
// Both accounts must be in the same partition (same partition key value)
var result = await container.Scripts.ExecuteStoredProcedureAsync<dynamic>(
    storedProcedureId: "transferBalance",
    partitionKey: new PartitionKey("bank-branch-001"),
    parameters: new dynamic[] { "account-A", "account-B", 50.00 }
);

Console.WriteLine($"Transfer result: {result.Resource}");
```

## Bulk Insert Stored Procedure

Here is a stored procedure for inserting multiple documents in a single call, handling the bounded execution time:

```javascript
// Bulk insert stored procedure
// Handles continuation if there are more documents than can be
// processed in a single execution window
function bulkInsert(docs) {
    var context = getContext();
    var container = context.getCollection();
    var response = context.getResponse();
    var count = 0;

    if (!docs || docs.length === 0) {
        response.setBody({ inserted: 0 });
        return;
    }

    // Start inserting documents one at a time
    insertNext();

    function insertNext() {
        if (count >= docs.length) {
            // All documents inserted successfully
            response.setBody({ inserted: count, completed: true });
            return;
        }

        var accepted = container.createDocument(
            container.getSelfLink(),
            docs[count],
            function (err, doc) {
                if (err) throw new Error("Insert failed at index " + count + ": " + err.message);
                count++;
                insertNext(); // Process the next document
            }
        );

        // If not accepted (running out of time/RUs), return progress
        // The caller can resume with remaining documents
        if (!accepted) {
            response.setBody({ inserted: count, completed: false });
        }
    }
}
```

Execute the bulk insert:

```csharp
// Bulk insert documents using the stored procedure
// Handle continuation if not all documents fit in one execution
var documents = GenerateDocuments(100); // Create 100 documents
int totalInserted = 0;
bool completed = false;

while (!completed)
{
    // Send remaining documents
    var remaining = documents.Skip(totalInserted).ToArray();

    var result = await container.Scripts.ExecuteStoredProcedureAsync<dynamic>(
        storedProcedureId: "bulkInsert",
        partitionKey: new PartitionKey("partition-1"),
        parameters: new dynamic[] { remaining }
    );

    int batchInserted = (int)result.Resource.inserted;
    completed = (bool)result.Resource.completed;
    totalInserted += batchInserted;

    Console.WriteLine($"Inserted {totalInserted} of {documents.Length} documents");
}
```

## Error Handling Best Practices

1. Always check the `accepted` return value from container operations. If it returns false, the operation was not queued due to resource constraints.

2. Use try-catch in your stored procedures to provide meaningful error messages:

```javascript
// Wrap stored procedure logic in try-catch for better error messages
function safeOperation(docId) {
    var context = getContext();
    var response = context.getResponse();

    try {
        // Your logic here
        doSomething(docId);
    } catch (error) {
        // Return a structured error response
        response.setBody({
            success: false,
            error: error.message,
            documentId: docId
        });
    }
}
```

3. Remember that throwing an error inside a stored procedure causes the entire transaction to roll back, which is usually what you want for data consistency.

## Updating and Deleting Stored Procedures

```csharp
// Update an existing stored procedure
string updatedBody = File.ReadAllText("updatedProcedure.js");
StoredProcedureProperties props = new StoredProcedureProperties
{
    Id = "createDocument",
    Body = updatedBody
};
await container.Scripts.ReplaceStoredProcedureAsync(props);

// Delete a stored procedure
await container.Scripts.DeleteStoredProcedureAsync("createDocument");
```

Stored procedures in Cosmos DB are a focused tool for a specific job - atomic multi-document operations within a single partition. They are not meant to replace your application logic wholesale. Use them when you need transactions or want to minimize round trips for batch operations, and keep the JavaScript code simple and well-tested.
