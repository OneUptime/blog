# How to Use Inline Code Actions in Azure Logic Apps to Transform Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Logic Apps, Inline Code, Data Transformation, JavaScript, Workflow Automation, Integration, Azure Cloud

Description: Learn how to use inline code actions in Azure Logic Apps to write custom JavaScript for data transformation, validation, and processing within your workflows.

---

Logic Apps has a lot of built-in actions for data manipulation - Compose, Parse JSON, Select, Filter Array. But sometimes your transformation logic is complex enough that wiring together ten built-in actions is harder to read and maintain than just writing a few lines of code. That is where inline code actions come in.

The inline code action lets you write JavaScript directly inside your Logic App workflow. You can access data from previous actions, perform transformations, run calculations, and return results to be used by subsequent actions. It is the escape hatch for when the visual designer is not enough.

## What Inline Code Can Do

The inline code action in Logic Apps supports JavaScript (Node.js) and can:

- Access outputs from previous workflow actions
- Perform string manipulation, date formatting, and math
- Transform JSON structures (reshape, filter, aggregate)
- Validate data against custom rules
- Return results that downstream actions can consume

What it cannot do:

- Make HTTP calls (use the HTTP action instead)
- Access the file system
- Import npm packages (only built-in Node.js modules)
- Run for more than a few seconds (there is an execution time limit)

## Prerequisites

Inline code actions require an Integration Account linked to your Logic App. Even the free tier Integration Account works for inline code.

```bash
# Create a free-tier Integration Account
az logic integration-account create \
  --resource-group myRG \
  --name myIntegrationAccount \
  --location eastus \
  --sku Free

# Link it to your Logic App
az logic workflow update \
  --resource-group myRG \
  --name myLogicApp \
  --integration-account "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Logic/integrationAccounts/myIntegrationAccount"
```

## Example 1: Reshape a JSON Payload

A common scenario is receiving data from one API in a format that does not match what another API expects.

Say you receive this from a source system:

```json
{
  "customer_first_name": "Jane",
  "customer_last_name": "Smith",
  "order_items": [
    {"sku": "ABC-123", "qty": 2, "unit_price": 29.99},
    {"sku": "DEF-456", "qty": 1, "unit_price": 49.99}
  ],
  "ship_to_address": "123 Main St, Springfield, IL 62701"
}
```

But your destination system expects this format:

```json
{
  "customerName": "Jane Smith",
  "lineItems": [
    {"productCode": "ABC-123", "quantity": 2, "price": 29.99, "lineTotal": 59.98},
    {"productCode": "DEF-456", "quantity": 1, "price": 49.99, "lineTotal": 49.99}
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62701"
  },
  "orderTotal": 109.97
}
```

The inline code to perform this transformation:

```javascript
// Transform the source payload into the destination format
var source = workflowContext.actions.Parse_Source_Data.outputs.body;

// Parse the shipping address
var addressParts = source.ship_to_address.split(', ');
var streetCity = addressParts[0] || '';
var stateZip = (addressParts[1] || '').split(' ');

// Transform line items and calculate totals
var lineItems = source.order_items.map(function(item) {
    return {
        productCode: item.sku,
        quantity: item.qty,
        price: item.unit_price,
        lineTotal: Math.round(item.qty * item.unit_price * 100) / 100
    };
});

// Calculate order total
var orderTotal = lineItems.reduce(function(sum, item) {
    return sum + item.lineTotal;
}, 0);

// Build the destination payload
var result = {
    customerName: source.customer_first_name + ' ' + source.customer_last_name,
    lineItems: lineItems,
    shippingAddress: {
        street: addressParts.length >= 2 ? addressParts.slice(0, -1).join(', ').replace(/, [A-Z]{2} \d{5}$/, '') : streetCity,
        city: addressParts.length >= 2 ? addressParts[addressParts.length - 2] : '',
        state: stateZip.length >= 2 ? stateZip[stateZip.length - 2] : '',
        zip: stateZip.length >= 1 ? stateZip[stateZip.length - 1] : ''
    },
    orderTotal: Math.round(orderTotal * 100) / 100
};

return result;
```

## Example 2: Validate Data Before Processing

Use inline code to validate incoming data and return validation results:

```javascript
// Validate an incoming order before processing
var order = workflowContext.actions.Get_Order.outputs.body;
var errors = [];

// Check required fields exist and are not empty
if (!order.customerId || order.customerId.trim() === '') {
    errors.push('Customer ID is required');
}

if (!order.items || order.items.length === 0) {
    errors.push('Order must contain at least one item');
}

// Validate each item has positive quantity and price
if (order.items) {
    order.items.forEach(function(item, index) {
        if (!item.quantity || item.quantity <= 0) {
            errors.push('Item ' + (index + 1) + ' has invalid quantity');
        }
        if (!item.price || item.price <= 0) {
            errors.push('Item ' + (index + 1) + ' has invalid price');
        }
        if (!item.sku || item.sku.trim() === '') {
            errors.push('Item ' + (index + 1) + ' is missing SKU');
        }
    });
}

// Validate order total does not exceed limit
var calculatedTotal = (order.items || []).reduce(function(sum, item) {
    return sum + (item.quantity * item.price);
}, 0);

if (calculatedTotal > 100000) {
    errors.push('Order total exceeds $100,000 limit: $' + calculatedTotal.toFixed(2));
}

// Return validation result
return {
    isValid: errors.length === 0,
    errorCount: errors.length,
    errors: errors,
    calculatedTotal: Math.round(calculatedTotal * 100) / 100
};
```

After this action, add a Condition action that checks the `isValid` property. If true, proceed with processing. If false, send a notification with the error details.

## Example 3: Aggregate Data from Multiple Sources

When you need to combine data from parallel actions:

```javascript
// Merge customer data from CRM and billing system
var crmData = workflowContext.actions.Get_CRM_Customer.outputs.body;
var billingData = workflowContext.actions.Get_Billing_Customer.outputs.body;

// Build a unified customer profile
var profile = {
    // CRM is the source of truth for personal info
    id: crmData.customerId,
    name: crmData.fullName,
    email: crmData.emailAddress,
    phone: crmData.phoneNumber,
    segment: crmData.customerSegment,

    // Billing system has financial info
    accountStatus: billingData.status,
    paymentMethod: billingData.defaultPaymentMethod,
    creditLimit: billingData.creditLimit,
    outstandingBalance: billingData.currentBalance,

    // Computed fields
    hasOutstandingBalance: billingData.currentBalance > 0,
    creditAvailable: billingData.creditLimit - billingData.currentBalance,
    isHighValue: crmData.customerSegment === 'Enterprise' || billingData.creditLimit > 50000,

    // Metadata
    lastUpdated: new Date().toISOString(),
    dataSources: ['CRM', 'Billing']
};

return profile;
```

## Example 4: Format Dates and Generate Reference Numbers

```javascript
// Generate a formatted order reference and format dates for the target system
var order = workflowContext.actions.Receive_Order.outputs.body;
var now = new Date();

// Generate order reference: ORD-YYYYMMDD-XXXXX
var dateStr = now.getFullYear().toString() +
    ('0' + (now.getMonth() + 1)).slice(-2) +
    ('0' + now.getDate()).slice(-2);
var random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
var orderRef = 'ORD-' + dateStr + '-' + random;

// Format dates for the destination API (expects DD/MM/YYYY)
function formatDate(isoString) {
    if (!isoString) return null;
    var d = new Date(isoString);
    return ('0' + d.getDate()).slice(-2) + '/' +
           ('0' + (d.getMonth() + 1)).slice(-2) + '/' +
           d.getFullYear();
}

// Calculate estimated delivery date (5 business days from now)
function addBusinessDays(date, days) {
    var result = new Date(date);
    var added = 0;
    while (added < days) {
        result.setDate(result.getDate() + 1);
        var dayOfWeek = result.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            added++;
        }
    }
    return result;
}

var deliveryDate = addBusinessDays(now, 5);

return {
    orderReference: orderRef,
    orderDate: formatDate(now.toISOString()),
    estimatedDelivery: formatDate(deliveryDate.toISOString()),
    processingTimestamp: now.toISOString()
};
```

## Example 5: Deduplicate and Clean Data

```javascript
// Clean and deduplicate a list of email addresses from a form submission
var formData = workflowContext.actions.Get_Form_Submissions.outputs.body;

// Extract all email fields (some forms have multiple email inputs)
var allEmails = [];
formData.forEach(function(submission) {
    if (submission.email) allEmails.push(submission.email);
    if (submission.alternateEmail) allEmails.push(submission.alternateEmail);
    if (submission.workEmail) allEmails.push(submission.workEmail);
});

// Clean: trim whitespace, convert to lowercase, validate format
var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var cleanedEmails = allEmails
    .map(function(email) { return email.trim().toLowerCase(); })
    .filter(function(email) { return emailRegex.test(email); });

// Deduplicate by converting to object keys and back
var uniqueMap = {};
cleanedEmails.forEach(function(email) {
    uniqueMap[email] = true;
});
var uniqueEmails = Object.keys(uniqueMap);

// Separate by domain for analysis
var domains = {};
uniqueEmails.forEach(function(email) {
    var domain = email.split('@')[1];
    if (!domains[domain]) domains[domain] = [];
    domains[domain].push(email);
});

return {
    totalSubmitted: allEmails.length,
    invalidRemoved: allEmails.length - cleanedEmails.length,
    duplicatesRemoved: cleanedEmails.length - uniqueEmails.length,
    uniqueEmails: uniqueEmails,
    emailsByDomain: domains
};
```

## Accessing Previous Action Outputs

The key to inline code is accessing data from previous actions through `workflowContext.actions`:

```javascript
// Different ways to access previous action data
var httpResponse = workflowContext.actions.HTTP_Action.outputs.body;
var triggerBody = workflowContext.trigger().outputs.body;
var parsedJson = workflowContext.actions.Parse_JSON.outputs.body;

// Access specific properties
var statusCode = workflowContext.actions.HTTP_Action.outputs.statusCode;
var headers = workflowContext.actions.HTTP_Action.outputs.headers;
```

The action names must match exactly what they are called in your workflow (with underscores replacing spaces).

## Limitations and Workarounds

- **Execution time limit**: Inline code has a timeout (usually around 5 seconds). For complex processing, break it into multiple inline code actions.
- **No external calls**: Use separate HTTP actions for API calls and pass the results to inline code.
- **No npm packages**: Stick to built-in JavaScript. For complex needs, use Azure Functions instead and call them from Logic Apps.
- **Memory limit**: Large datasets may hit memory limits. Process data in chunks if needed.

## When to Use Azure Functions Instead

If your inline code is getting too complex (more than 50-100 lines), consider moving it to an Azure Function and calling it from Logic Apps. Functions give you:

- Full npm package support
- Longer execution times
- Better debugging and testing
- Shared logic across multiple workflows

## Summary

Inline code actions give you the flexibility of custom code within the visual Logic Apps designer. Use them for data transformations, validations, aggregations, and formatting that would be awkward or unreadable with built-in actions alone. Keep the code focused and simple, access previous action outputs through the workflow context, and move to Azure Functions when complexity grows beyond what inline code handles comfortably.
