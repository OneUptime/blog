# Use Step Functions Map State for Parallel Processing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Step Functions, Parallel Processing, Serverless

Description: Learn how to use the AWS Step Functions Map state to process collections of items in parallel with both inline and distributed modes.

---

Processing a list of items one at a time is slow. If you've got 500 orders to validate, 1,000 images to resize, or 10,000 records to transform, you want to process them in parallel. The Step Functions Map state does exactly this - it takes a collection and applies the same workflow to each item, running them concurrently.

There are two flavors: Inline Map for small batches (up to 40 concurrent iterations) and Distributed Map for massive batches (up to 10,000 concurrent iterations). Let's look at both.

## Inline Map State

The Inline Map runs a set of steps for each item in an array. It's the simpler option and works well when your collection has fewer than a few hundred items.

Here's a workflow that validates and processes each item in an order:

```json
{
  "Comment": "Process each order item in parallel",
  "StartAt": "ProcessOrderItems",
  "States": {
    "ProcessOrderItems": {
      "Type": "Map",
      "ItemsPath": "$.items",
      "MaxConcurrency": 10,
      "Iterator": {
        "StartAt": "ValidateItem",
        "States": {
          "ValidateItem": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:us-east-1:123456789:function:validate-item",
            "Next": "CalculateShipping"
          },
          "CalculateShipping": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:us-east-1:123456789:function:calc-shipping",
            "End": true
          }
        }
      },
      "ResultPath": "$.processedItems",
      "Next": "AggregateResults"
    },
    "AggregateResults": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:aggregate",
      "End": true
    }
  }
}
```

`ItemsPath` points to the array in your input. Each element becomes the input to one iteration of the Map's `Iterator`. `MaxConcurrency` caps how many iterations run at the same time - set it to 0 for unlimited concurrency.

## Passing Context to Map Iterations

Sometimes each iteration needs access to data from outside the array. Use `ItemSelector` (formerly `Parameters`) to shape the input.

This passes both the current item and the parent order ID to each iteration:

```json
{
  "ProcessItems": {
    "Type": "Map",
    "ItemsPath": "$.items",
    "ItemSelector": {
      "item.$": "$$.Map.Item.Value",
      "index.$": "$$.Map.Item.Index",
      "orderId.$": "$.orderId",
      "customerId.$": "$.customerId"
    },
    "Iterator": {
      "StartAt": "ProcessSingleItem",
      "States": {
        "ProcessSingleItem": {
          "Type": "Task",
          "Resource": "arn:aws:lambda:us-east-1:123456789:function:process-item",
          "End": true
        }
      }
    },
    "End": true
  }
}
```

`$$.Map.Item.Value` gives you the current array element. `$$.Map.Item.Index` gives you its position. The `$` references (like `$.orderId`) pull from the Map state's input, not the individual item.

## The Lambda Function

Each iteration runs independently. Your Lambda function processes a single item.

This function handles one item from the collection:

```javascript
// processItem.js - Processes a single item from the Map state
exports.handler = async (event) => {
  const { item, index, orderId, customerId } = event;

  console.log(`Processing item ${index} for order ${orderId}`);

  // Do your per-item work here
  const processed = {
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.price,
    subtotal: item.price * item.quantity,
    tax: item.price * item.quantity * 0.08,
    total: item.price * item.quantity * 1.08
  };

  return {
    ...processed,
    processedAt: new Date().toISOString()
  };
};
```

The Map state collects all the return values into an array. So if you process 5 items, you get an array of 5 results.

## Error Handling in Map States

When one iteration fails, you have options. By default, the entire Map state fails if any iteration fails. You can change this with `ToleratedFailurePercentage` or `ToleratedFailureCount`.

This configuration allows up to 10% of iterations to fail without failing the whole Map:

```json
{
  "ProcessBatch": {
    "Type": "Map",
    "ItemsPath": "$.records",
    "MaxConcurrency": 20,
    "ToleratedFailurePercentage": 10,
    "Iterator": {
      "StartAt": "ProcessRecord",
      "States": {
        "ProcessRecord": {
          "Type": "Task",
          "Resource": "arn:aws:lambda:us-east-1:123456789:function:process-record",
          "Retry": [
            {
              "ErrorEquals": ["States.TaskFailed"],
              "IntervalSeconds": 2,
              "MaxAttempts": 3,
              "BackoffRate": 2.0
            }
          ],
          "End": true
        }
      }
    },
    "End": true
  }
}
```

You can also add Retry and Catch blocks to individual states within the Iterator, just like you would in a normal workflow.

## Distributed Map for Large-Scale Processing

When you're dealing with thousands or millions of items, Inline Map won't cut it. Distributed Map can process up to 10,000 items concurrently and can read input directly from S3.

This Distributed Map reads items from an S3 CSV file and processes each row:

```json
{
  "Comment": "Process large CSV file with Distributed Map",
  "StartAt": "ProcessLargeDataset",
  "States": {
    "ProcessLargeDataset": {
      "Type": "Map",
      "ItemProcessor": {
        "ProcessorConfig": {
          "Mode": "DISTRIBUTED",
          "ExecutionType": "STANDARD"
        },
        "StartAt": "TransformRecord",
        "States": {
          "TransformRecord": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:us-east-1:123456789:function:transform",
            "End": true
          }
        }
      },
      "ItemReader": {
        "Resource": "arn:aws:states:::s3:getObject",
        "ReaderConfig": {
          "InputType": "CSV",
          "CSVHeaderLocation": "FIRST_ROW"
        },
        "Parameters": {
          "Bucket": "my-data-bucket",
          "Key": "input/records.csv"
        }
      },
      "MaxConcurrency": 1000,
      "ResultWriter": {
        "Resource": "arn:aws:states:::s3:putObject",
        "Parameters": {
          "Bucket": "my-data-bucket",
          "Prefix": "output/results"
        }
      },
      "End": true
    }
  }
}
```

Notice the differences from Inline Map. `ItemProcessor` replaces `Iterator` and includes a `ProcessorConfig` with mode set to "DISTRIBUTED". `ItemReader` pulls data from S3 instead of the state input. `ResultWriter` sends outputs to S3 instead of collecting them in memory.

## Batching Items

Instead of processing one item per iteration, you can batch them. This reduces the number of Lambda invocations and is more efficient for lightweight processing.

This configuration sends 25 items at a time to each Lambda invocation:

```json
{
  "ProcessInBatches": {
    "Type": "Map",
    "ItemProcessor": {
      "ProcessorConfig": {
        "Mode": "DISTRIBUTED",
        "ExecutionType": "EXPRESS"
      },
      "StartAt": "ProcessBatch",
      "States": {
        "ProcessBatch": {
          "Type": "Task",
          "Resource": "arn:aws:lambda:us-east-1:123456789:function:process-batch",
          "End": true
        }
      }
    },
    "ItemReader": {
      "Resource": "arn:aws:states:::s3:getObject",
      "ReaderConfig": {
        "InputType": "JSON"
      },
      "Parameters": {
        "Bucket": "my-data-bucket",
        "Key": "input/items.json"
      }
    },
    "ItemBatcher": {
      "MaxItemsPerBatch": 25,
      "MaxInputBytesPerBatch": 262144
    },
    "MaxConcurrency": 100,
    "End": true
  }
}
```

Your Lambda function receives an array of items instead of a single item:

```javascript
// processBatch.js - Processes a batch of items from Distributed Map
exports.handler = async (event) => {
  const items = event.Items; // Array of items in this batch

  console.log(`Processing batch of ${items.length} items`);

  const results = [];

  for (const item of items) {
    // Process each item in the batch
    const result = await processItem(item);
    results.push(result);
  }

  return {
    processedCount: results.length,
    results
  };
};

async function processItem(item) {
  // Your per-item processing logic
  return {
    id: item.id,
    status: 'processed',
    timestamp: new Date().toISOString()
  };
}
```

## Real-World Example: Image Processing Pipeline

Here's a practical example - processing a batch of uploaded images.

This workflow resizes and generates thumbnails for every image in a folder:

```json
{
  "Comment": "Batch image processing pipeline",
  "StartAt": "ListImages",
  "States": {
    "ListImages": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:list-images",
      "Next": "ProcessImages"
    },
    "ProcessImages": {
      "Type": "Map",
      "ItemsPath": "$.images",
      "MaxConcurrency": 20,
      "Iterator": {
        "StartAt": "DownloadImage",
        "States": {
          "DownloadImage": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:us-east-1:123456789:function:download-image",
            "Next": "ResizeImage"
          },
          "ResizeImage": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:us-east-1:123456789:function:resize-image",
            "Next": "GenerateThumbnail"
          },
          "GenerateThumbnail": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:us-east-1:123456789:function:generate-thumbnail",
            "Retry": [
              {
                "ErrorEquals": ["States.TaskFailed"],
                "IntervalSeconds": 2,
                "MaxAttempts": 2,
                "BackoffRate": 2.0
              }
            ],
            "End": true
          }
        }
      },
      "Next": "NotifyComplete"
    },
    "NotifyComplete": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:notify",
      "End": true
    }
  }
}
```

## Monitoring Map State Performance

Keep an eye on how your Map state iterations are performing. CloudWatch gives you metrics on running, succeeded, and failed iterations. If you're seeing a lot of failures, check whether you're hitting Lambda concurrency limits or downstream rate limits. For more on monitoring, check out our post on [monitoring Step Functions executions](https://oneuptime.com/blog/post/2026-02-12-monitor-step-functions-executions-console/view).

## Wrapping Up

The Map state turns Step Functions from a sequential workflow engine into a parallel processing powerhouse. Inline Map handles small collections with simplicity. Distributed Map handles millions of items by reading from and writing to S3. Between MaxConcurrency, tolerated failures, and batching, you have fine-grained control over how your parallel processing behaves. It's the serverless equivalent of a MapReduce job, without the cluster management.
