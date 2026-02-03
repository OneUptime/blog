# How to Use Laravel Collections Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PHP, Laravel, Collections, Data Processing, Functional

Description: Master Laravel Collections for elegant data manipulation. This guide covers essential methods, chaining, lazy collections, and real-world patterns.

---

If you have been working with PHP for any length of time, you know how tedious array manipulation can get. Nested loops, temporary variables, and awkward conditionals pile up fast. Laravel Collections change everything. They wrap arrays in a fluent, object-oriented interface that makes data processing feel almost effortless.

In this guide, we will explore Laravel Collections from the ground up. Whether you are building APIs, processing CSV imports, or transforming database results, these techniques will make your code cleaner and more expressive.

## What Are Laravel Collections?

Collections are Laravel's answer to array manipulation. Under the hood, a Collection is simply a wrapper around a PHP array, but it provides dozens of methods for filtering, transforming, and aggregating data without writing manual loops.

The beauty lies in method chaining. Instead of storing intermediate results in variables, you can pipe data through a series of transformations in a single, readable statement.

## Creating Collections

Let us start with the basics. There are several ways to create a Collection.

### Using the collect() Helper

The most common approach uses the global `collect()` helper function:

```php
<?php

// Creating a collection from an array
$numbers = collect([1, 2, 3, 4, 5]);

// Creating a collection from associative arrays
$users = collect([
    ['name' => 'Alice', 'age' => 28, 'role' => 'developer'],
    ['name' => 'Bob', 'age' => 34, 'role' => 'designer'],
    ['name' => 'Charlie', 'age' => 25, 'role' => 'developer'],
]);

// Empty collection - useful as a starting point
$empty = collect();
```

### Using the Collection Class Directly

You can also instantiate the Collection class:

```php
<?php

use Illuminate\Support\Collection;

// Direct instantiation
$items = new Collection(['apple', 'banana', 'cherry']);

// The make() static method does the same thing
$items = Collection::make(['apple', 'banana', 'cherry']);
```

### Creating Collections from Ranges and Repetition

Laravel provides helpers for generating collections programmatically:

```php
<?php

// Create a collection with a range of numbers
// This generates [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
$range = collect(range(1, 10));

// Create a collection by repeating a value
// This creates ['hello', 'hello', 'hello']
$repeated = Collection::times(3, function () {
    return 'hello';
});

// Generate sequential data with times()
// Creates items with incrementing IDs
$sequentialItems = Collection::times(5, function ($number) {
    return [
        'id' => $number,
        'name' => "Item {$number}",
        'created_at' => now()->subDays(5 - $number),
    ];
});
```

### Eloquent and Collections

When you query the database with Eloquent, you automatically get Collections:

```php
<?php

// Eloquent queries return Collections
$activeUsers = User::where('status', 'active')->get();

// The result is already a Collection, so you can chain methods
$activeUserEmails = User::where('status', 'active')
    ->get()
    ->pluck('email')
    ->unique()
    ->values();
```

## Essential Transformation Methods

Now let us dive into the methods you will use most often. These form the foundation of Collection-based data processing.

### map() - Transform Every Item

The `map()` method applies a callback to each item and returns a new Collection with the results:

```php
<?php

$prices = collect([100, 200, 300, 400, 500]);

// Apply a 10% discount to all prices
$discountedPrices = $prices->map(function ($price) {
    return $price * 0.9;
});

// Result: [90, 180, 270, 360, 450]

// You can also access the key in the callback
$users = collect([
    'alice' => ['name' => 'Alice', 'score' => 85],
    'bob' => ['name' => 'Bob', 'score' => 92],
]);

$formattedUsers = $users->map(function ($user, $key) {
    return [
        'username' => $key,
        'display_name' => $user['name'],
        'grade' => $user['score'] >= 90 ? 'A' : 'B',
    ];
});
```

### mapWithKeys() - Transform Keys and Values

When you need to restructure data with new keys:

```php
<?php

$employees = collect([
    ['id' => 101, 'name' => 'Sarah', 'department' => 'Engineering'],
    ['id' => 102, 'name' => 'Mike', 'department' => 'Marketing'],
    ['id' => 103, 'name' => 'Lisa', 'department' => 'Engineering'],
]);

// Create a lookup table keyed by employee ID
$employeeLookup = $employees->mapWithKeys(function ($employee) {
    return [$employee['id'] => $employee['name']];
});

// Result: [101 => 'Sarah', 102 => 'Mike', 103 => 'Lisa']

// Now you can quickly look up names by ID
$name = $employeeLookup[102]; // 'Mike'
```

### filter() - Keep Only Matching Items

The `filter()` method removes items that do not match your criteria:

```php
<?php

$products = collect([
    ['name' => 'Laptop', 'price' => 1200, 'in_stock' => true],
    ['name' => 'Mouse', 'price' => 25, 'in_stock' => true],
    ['name' => 'Keyboard', 'price' => 75, 'in_stock' => false],
    ['name' => 'Monitor', 'price' => 400, 'in_stock' => true],
    ['name' => 'Headphones', 'price' => 150, 'in_stock' => false],
]);

// Get only products that are in stock
$availableProducts = $products->filter(function ($product) {
    return $product['in_stock'] === true;
});

// Get expensive products (over $100) that are available
$premiumAvailable = $products->filter(function ($product) {
    return $product['price'] > 100 && $product['in_stock'];
});

// Without a callback, filter() removes falsy values
$values = collect([0, 1, '', 'hello', null, [], ['item']]);
$truthy = $values->filter();
// Result: [1 => 1, 3 => 'hello', 6 => ['item']]
```

### reject() - The Opposite of filter()

Sometimes it is more natural to specify what you do not want:

```php
<?php

$tasks = collect([
    ['title' => 'Write tests', 'completed' => true],
    ['title' => 'Fix bug', 'completed' => false],
    ['title' => 'Code review', 'completed' => true],
    ['title' => 'Deploy', 'completed' => false],
]);

// Get incomplete tasks - reject completed ones
$pendingTasks = $tasks->reject(function ($task) {
    return $task['completed'];
});

// Result: tasks 'Fix bug' and 'Deploy'
```

### reduce() - Aggregate to a Single Value

The `reduce()` method iterates through items, accumulating a result:

```php
<?php

$orderItems = collect([
    ['product' => 'Shirt', 'quantity' => 2, 'price' => 30],
    ['product' => 'Pants', 'quantity' => 1, 'price' => 50],
    ['product' => 'Socks', 'quantity' => 3, 'price' => 10],
]);

// Calculate total order value
$totalValue = $orderItems->reduce(function ($carry, $item) {
    // $carry holds the accumulated value
    // $item is the current item being processed
    return $carry + ($item['quantity'] * $item['price']);
}, 0); // 0 is the initial value

// Result: 140 (60 + 50 + 30)

// Build a summary string
$summary = $orderItems->reduce(function ($carry, $item) {
    $itemTotal = $item['quantity'] * $item['price'];
    return $carry . "{$item['product']}: \${$itemTotal}\n";
}, "Order Summary:\n");
```

### each() - Iterate Without Transforming

When you need to perform side effects without changing the collection:

```php
<?php

$notifications = collect([
    ['user_id' => 1, 'message' => 'Welcome!'],
    ['user_id' => 2, 'message' => 'Your order shipped'],
    ['user_id' => 3, 'message' => 'Payment received'],
]);

// Send each notification - this does not modify the collection
$notifications->each(function ($notification) {
    // In a real app, this might call a notification service
    Log::info("Sending to user {$notification['user_id']}: {$notification['message']}");

    // Simulate sending
    NotificationService::send(
        $notification['user_id'],
        $notification['message']
    );
});

// You can stop iteration early by returning false
$numbers = collect([1, 2, 3, 4, 5]);
$numbers->each(function ($number) {
    if ($number > 3) {
        return false; // Stops iteration
    }
    echo $number . "\n";
});
// Outputs: 1, 2, 3
```

## Extracting and Restructuring Data

Laravel Collections shine when you need to pull specific pieces from complex data structures.

### pluck() - Extract a Single Field

The `pluck()` method extracts values for a given key:

```php
<?php

$articles = collect([
    ['id' => 1, 'title' => 'Getting Started with Laravel', 'author' => 'Jane'],
    ['id' => 2, 'title' => 'Advanced Eloquent Tips', 'author' => 'John'],
    ['id' => 3, 'title' => 'Testing Best Practices', 'author' => 'Jane'],
]);

// Get all titles
$titles = $articles->pluck('title');
// Result: ['Getting Started with Laravel', 'Advanced Eloquent Tips', 'Testing Best Practices']

// Pluck with a key - create an associative array
$titlesById = $articles->pluck('title', 'id');
// Result: [1 => 'Getting Started with Laravel', 2 => 'Advanced Eloquent Tips', ...]

// Pluck from nested structures using dot notation
$users = collect([
    ['name' => 'Alice', 'address' => ['city' => 'New York', 'zip' => '10001']],
    ['name' => 'Bob', 'address' => ['city' => 'Los Angeles', 'zip' => '90001']],
]);

$cities = $users->pluck('address.city');
// Result: ['New York', 'Los Angeles']
```

### only() and except() - Select or Exclude Keys

These methods work on single items or collections of associative arrays:

```php
<?php

$config = collect([
    'app_name' => 'MyApp',
    'debug' => true,
    'database' => 'mysql',
    'secret_key' => 'abc123xyz',
    'api_token' => 'token_secret',
]);

// Get only specific keys - useful for whitelisting
$publicConfig = $config->only(['app_name', 'debug', 'database']);
// Result: ['app_name' => 'MyApp', 'debug' => true, 'database' => 'mysql']

// Exclude specific keys - useful for removing sensitive data
$safeConfig = $config->except(['secret_key', 'api_token']);
// Same result as above
```

### values() - Reset Numeric Keys

After filtering, your keys might have gaps. Use `values()` to re-index:

```php
<?php

$items = collect(['a', 'b', 'c', 'd', 'e']);

// Filter keeps original keys
$filtered = $items->filter(function ($item) {
    return in_array($item, ['a', 'c', 'e']);
});
// Result: [0 => 'a', 2 => 'c', 4 => 'e'] - notice the gaps

// Reset to sequential keys
$reindexed = $filtered->values();
// Result: [0 => 'a', 1 => 'c', 2 => 'e'] - clean sequential keys
```

### keys() - Get All Keys

Extract the keys from an associative collection:

```php
<?php

$inventory = collect([
    'apples' => 50,
    'oranges' => 30,
    'bananas' => 45,
]);

$fruitTypes = $inventory->keys();
// Result: ['apples', 'oranges', 'bananas']
```

## Grouping and Organizing Data

Collections provide powerful methods for organizing data into logical groups.

### groupBy() - Group by a Key or Callback

The `groupBy()` method organizes items into groups:

```php
<?php

$employees = collect([
    ['name' => 'Alice', 'department' => 'Engineering', 'level' => 'Senior'],
    ['name' => 'Bob', 'department' => 'Marketing', 'level' => 'Junior'],
    ['name' => 'Charlie', 'department' => 'Engineering', 'level' => 'Junior'],
    ['name' => 'Diana', 'department' => 'Marketing', 'level' => 'Senior'],
    ['name' => 'Eve', 'department' => 'Engineering', 'level' => 'Senior'],
]);

// Group by department
$byDepartment = $employees->groupBy('department');

// Result structure:
// [
//     'Engineering' => [
//         ['name' => 'Alice', ...],
//         ['name' => 'Charlie', ...],
//         ['name' => 'Eve', ...],
//     ],
//     'Marketing' => [
//         ['name' => 'Bob', ...],
//         ['name' => 'Diana', ...],
//     ],
// ]

// Group by a computed value using a callback
$byLevel = $employees->groupBy(function ($employee) {
    return $employee['level'];
});

// Multi-level grouping - group by department, then by level
$organized = $employees->groupBy('department')->map(function ($group) {
    return $group->groupBy('level');
});
```

### keyBy() - Rekey the Collection

Transform a collection to use a specific field as keys:

```php
<?php

$products = collect([
    ['sku' => 'LAPTOP-001', 'name' => 'Pro Laptop', 'price' => 1299],
    ['sku' => 'MOUSE-002', 'name' => 'Wireless Mouse', 'price' => 49],
    ['sku' => 'KEYBOARD-003', 'name' => 'Mechanical Keyboard', 'price' => 129],
]);

// Rekey by SKU for quick lookups
$productsBySku = $products->keyBy('sku');

// Now you can access products directly by SKU
$laptop = $productsBySku['LAPTOP-001'];
// Result: ['sku' => 'LAPTOP-001', 'name' => 'Pro Laptop', 'price' => 1299]

// Use a callback for custom keys
$productsBySlug = $products->keyBy(function ($product) {
    return Str::slug($product['name']);
});
// Keys: 'pro-laptop', 'wireless-mouse', 'mechanical-keyboard'
```

### partition() - Split into Two Groups

Separate items based on a condition:

```php
<?php

$users = collect([
    ['name' => 'Alice', 'subscription' => 'premium'],
    ['name' => 'Bob', 'subscription' => 'free'],
    ['name' => 'Charlie', 'subscription' => 'premium'],
    ['name' => 'Diana', 'subscription' => 'free'],
]);

// Split into premium and free users
[$premiumUsers, $freeUsers] = $users->partition(function ($user) {
    return $user['subscription'] === 'premium';
});

// $premiumUsers contains Alice and Charlie
// $freeUsers contains Bob and Diana

// Useful for processing different groups differently
$premiumUsers->each(function ($user) {
    // Send premium newsletter
});

$freeUsers->each(function ($user) {
    // Send upgrade promotion
});
```

### chunk() - Split into Fixed-Size Groups

Break a collection into smaller pieces:

```php
<?php

$allProducts = collect(range(1, 100))->map(function ($i) {
    return ['id' => $i, 'name' => "Product {$i}"];
});

// Process in batches of 10
$allProducts->chunk(10)->each(function ($batch) {
    // Each $batch is a Collection of 10 products
    // Perfect for batch database operations or API calls

    foreach ($batch as $product) {
        // Process product
    }

    // Or use the batch for bulk operations
    DB::table('products')->insert($batch->toArray());
});

// Chunk for pagination-style display
$pages = $allProducts->chunk(20);
$page3 = $pages->get(2); // Get items 41-60 (zero-indexed)
```

## Aggregation and Analysis

Collections provide methods for calculating statistics and finding specific items.

### Counting and Summing

```php
<?php

$orders = collect([
    ['product' => 'Laptop', 'amount' => 1200, 'status' => 'completed'],
    ['product' => 'Mouse', 'amount' => 25, 'status' => 'completed'],
    ['product' => 'Keyboard', 'amount' => 75, 'status' => 'pending'],
    ['product' => 'Monitor', 'amount' => 400, 'status' => 'completed'],
    ['product' => 'Headphones', 'amount' => 150, 'status' => 'refunded'],
]);

// Count total items
$totalOrders = $orders->count(); // 5

// Count with a condition
$completedCount = $orders->where('status', 'completed')->count(); // 3

// Sum a specific field
$totalRevenue = $orders->sum('amount'); // 1850

// Sum with a callback for complex calculations
$completedRevenue = $orders
    ->where('status', 'completed')
    ->sum('amount'); // 1625

// Count occurrences of each value
$statusCounts = $orders->countBy('status');
// Result: ['completed' => 3, 'pending' => 1, 'refunded' => 1]
```

### Average, Min, Max, and Median

```php
<?php

$scores = collect([85, 92, 78, 95, 88, 76, 91]);

// Basic statistics
$average = $scores->avg(); // 86.43
$minimum = $scores->min(); // 76
$maximum = $scores->max(); // 95
$median = $scores->median(); // 88

// These work with pluck for object collections
$products = collect([
    ['name' => 'A', 'price' => 100],
    ['name' => 'B', 'price' => 200],
    ['name' => 'C', 'price' => 150],
]);

$avgPrice = $products->avg('price'); // 150
$cheapest = $products->min('price'); // 100
$mostExpensive = $products->max('price'); // 200
```

### Finding Items

```php
<?php

$users = collect([
    ['id' => 1, 'name' => 'Alice', 'role' => 'admin'],
    ['id' => 2, 'name' => 'Bob', 'role' => 'user'],
    ['id' => 3, 'name' => 'Charlie', 'role' => 'user'],
    ['id' => 4, 'name' => 'Diana', 'role' => 'moderator'],
]);

// Find the first match
$admin = $users->firstWhere('role', 'admin');
// Result: ['id' => 1, 'name' => 'Alice', 'role' => 'admin']

// Find with a callback
$firstNonAdmin = $users->first(function ($user) {
    return $user['role'] !== 'admin';
});

// Check if any item matches
$hasAdmin = $users->contains('role', 'admin'); // true

// Check with a callback
$hasHighId = $users->contains(function ($user) {
    return $user['id'] > 10;
}); // false

// Check if all items match
$allUsers = $users->every(function ($user) {
    return isset($user['name']);
}); // true
```

## Sorting Collections

Collections offer flexible sorting options.

```php
<?php

$products = collect([
    ['name' => 'Zebra Print', 'price' => 45, 'stock' => 10],
    ['name' => 'Apple Watch', 'price' => 399, 'stock' => 5],
    ['name' => 'Banana Stand', 'price' => 25, 'stock' => 20],
    ['name' => 'Cherry Picker', 'price' => 150, 'stock' => 3],
]);

// Sort by a single field (ascending)
$byName = $products->sortBy('name');
// Order: Apple Watch, Banana Stand, Cherry Picker, Zebra Print

// Sort descending
$byPriceDesc = $products->sortByDesc('price');
// Order: Apple Watch (399), Cherry Picker (150), Zebra Print (45), Banana Stand (25)

// Sort with a callback for custom logic
$byStockValue = $products->sortBy(function ($product) {
    return $product['price'] * $product['stock'];
});

// Sort by multiple criteria
$sorted = $products->sortBy([
    ['price', 'asc'],
    ['name', 'asc'],
]);

// For simple arrays, use sort() and sortDesc()
$numbers = collect([3, 1, 4, 1, 5, 9, 2, 6]);
$ascending = $numbers->sort()->values(); // [1, 1, 2, 3, 4, 5, 6, 9]
$descending = $numbers->sortDesc()->values(); // [9, 6, 5, 4, 3, 2, 1, 1]

// Reverse the current order
$reversed = $products->reverse();

// Randomize the order
$shuffled = $products->shuffle();
```

## Combining and Comparing Collections

Work with multiple collections together.

### Merging Collections

```php
<?php

$defaults = collect([
    'color' => 'blue',
    'size' => 'medium',
    'quantity' => 1,
]);

$userPreferences = collect([
    'color' => 'red',
    'quantity' => 5,
]);

// Merge - later values overwrite earlier ones
$finalSettings = $defaults->merge($userPreferences);
// Result: ['color' => 'red', 'size' => 'medium', 'quantity' => 5]

// Concat - append without overwriting (for indexed arrays)
$list1 = collect([1, 2, 3]);
$list2 = collect([4, 5, 6]);
$combined = $list1->concat($list2);
// Result: [1, 2, 3, 4, 5, 6]

// Union - keep first values on key collision (opposite of merge)
$result = $defaults->union($userPreferences);
// Result: ['color' => 'blue', 'size' => 'medium', 'quantity' => 1]
```

### Set Operations

```php
<?php

$teamA = collect(['Alice', 'Bob', 'Charlie']);
$teamB = collect(['Bob', 'Diana', 'Eve']);

// Items in A that are not in B
$onlyInA = $teamA->diff($teamB);
// Result: ['Alice', 'Charlie']

// Items that appear in both
$inBoth = $teamA->intersect($teamB);
// Result: ['Bob']

// For associative arrays, use diffAssoc and intersectByKeys
$array1 = collect(['a' => 1, 'b' => 2, 'c' => 3]);
$array2 = collect(['a' => 1, 'b' => 5, 'd' => 4]);

$diffAssoc = $array1->diffAssoc($array2);
// Result: ['b' => 2, 'c' => 3] - b differs in value, c is missing
```

### Unique Values

```php
<?php

$tags = collect(['php', 'laravel', 'php', 'javascript', 'laravel', 'vue']);

// Get unique values
$uniqueTags = $tags->unique();
// Result: ['php', 'laravel', 'javascript', 'vue']

// Unique by a specific key
$users = collect([
    ['id' => 1, 'name' => 'Alice', 'department' => 'Engineering'],
    ['id' => 2, 'name' => 'Bob', 'department' => 'Marketing'],
    ['id' => 3, 'name' => 'Charlie', 'department' => 'Engineering'],
]);

// Get one user per department
$uniqueByDept = $users->unique('department');
// Result: Alice (Engineering) and Bob (Marketing)

// Unique with a callback
$uniqueByNameLength = $users->unique(function ($user) {
    return strlen($user['name']);
});
```

## Lazy Collections for Large Datasets

When working with massive datasets, regular Collections load everything into memory. Lazy Collections process items one at a time, making them ideal for:

- Reading large files
- Processing database cursors
- Working with infinite sequences

### Creating Lazy Collections

```php
<?php

use Illuminate\Support\LazyCollection;

// From a generator function
$hugeDataset = LazyCollection::make(function () {
    $handle = fopen('huge_file.csv', 'r');

    while (($line = fgets($handle)) !== false) {
        yield str_getcsv($line);
    }

    fclose($handle);
});

// Process without loading entire file into memory
$hugeDataset
    ->skip(1) // Skip header row
    ->filter(function ($row) {
        return $row[2] > 100; // Filter by third column
    })
    ->each(function ($row) {
        // Process each matching row
        processRow($row);
    });
```

### Lazy Collections with Eloquent

```php
<?php

// Instead of get() which loads all results
$users = User::where('active', true)->get(); // Loads all into memory

// Use cursor() for lazy iteration
User::where('active', true)
    ->cursor() // Returns a LazyCollection
    ->filter(function ($user) {
        return $user->orders->count() > 10;
    })
    ->each(function ($user) {
        $user->update(['vip' => true]);
    });

// Process millions of records without memory issues
User::cursor()
    ->chunk(1000)
    ->each(function ($chunk) {
        // Process 1000 users at a time
        dispatch(new ProcessUsersJob($chunk));
    });
```

### Infinite Sequences

```php
<?php

use Illuminate\Support\LazyCollection;

// Generate an infinite sequence of Fibonacci numbers
$fibonacci = LazyCollection::make(function () {
    $a = 0;
    $b = 1;

    while (true) {
        yield $a;
        [$a, $b] = [$b, $a + $b];
    }
});

// Take only what you need
$firstTwenty = $fibonacci->take(20)->all();

// Find the first Fibonacci number over 1000
$overThousand = $fibonacci->first(function ($n) {
    return $n > 1000;
}); // 1597
```

## Method Chaining Patterns

The real power of Collections emerges when you chain methods together. Here are some common patterns.

### Data Pipeline Pattern

```php
<?php

// Transform raw API response into a clean format
$apiResponse = [
    'data' => [
        ['id' => 1, 'attributes' => ['name' => 'Item 1', 'price' => '19.99', 'active' => '1']],
        ['id' => 2, 'attributes' => ['name' => 'Item 2', 'price' => '29.99', 'active' => '0']],
        ['id' => 3, 'attributes' => ['name' => 'Item 3', 'price' => '39.99', 'active' => '1']],
    ],
];

$products = collect($apiResponse['data'])
    // Flatten the nested structure
    ->map(function ($item) {
        return array_merge(['id' => $item['id']], $item['attributes']);
    })
    // Convert types
    ->map(function ($item) {
        return [
            'id' => (int) $item['id'],
            'name' => $item['name'],
            'price' => (float) $item['price'],
            'active' => (bool) $item['active'],
        ];
    })
    // Filter active items only
    ->filter(function ($item) {
        return $item['active'];
    })
    // Sort by price
    ->sortBy('price')
    // Reset keys
    ->values();
```

### Report Generation Pattern

```php
<?php

// Generate a sales report from order data
$orders = collect([
    ['date' => '2024-01-15', 'product' => 'Widget', 'quantity' => 5, 'price' => 10],
    ['date' => '2024-01-15', 'product' => 'Gadget', 'quantity' => 2, 'price' => 25],
    ['date' => '2024-01-16', 'product' => 'Widget', 'quantity' => 3, 'price' => 10],
    ['date' => '2024-01-16', 'product' => 'Widget', 'quantity' => 7, 'price' => 10],
    ['date' => '2024-01-17', 'product' => 'Gadget', 'quantity' => 4, 'price' => 25],
]);

$report = $orders
    // Add calculated fields
    ->map(function ($order) {
        $order['total'] = $order['quantity'] * $order['price'];
        return $order;
    })
    // Group by date
    ->groupBy('date')
    // Calculate daily summaries
    ->map(function ($dayOrders, $date) {
        return [
            'date' => $date,
            'order_count' => $dayOrders->count(),
            'total_items' => $dayOrders->sum('quantity'),
            'total_revenue' => $dayOrders->sum('total'),
            'products' => $dayOrders->pluck('product')->unique()->values()->all(),
        ];
    })
    // Sort by date
    ->sortBy('date')
    ->values();

// Result is a clean daily summary report
```

### Conditional Pipeline with when() and unless()

```php
<?php

$users = User::all();
$searchTerm = request('search');
$sortOrder = request('sort', 'asc');
$filterRole = request('role');

$result = collect($users)
    // Only filter if search term provided
    ->when($searchTerm, function ($collection, $search) {
        return $collection->filter(function ($user) use ($search) {
            return str_contains(strtolower($user->name), strtolower($search));
        });
    })
    // Only filter by role if specified
    ->when($filterRole, function ($collection, $role) {
        return $collection->where('role', $role);
    })
    // Apply sorting
    ->when($sortOrder === 'desc', function ($collection) {
        return $collection->sortByDesc('name');
    }, function ($collection) {
        return $collection->sortBy('name');
    })
    ->values();
```

## Creating Custom Collection Methods

You can extend Collections with your own methods using macros.

### Defining Macros

```php
<?php

// In a Service Provider (AppServiceProvider or dedicated CollectionServiceProvider)
use Illuminate\Support\Collection;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot()
    {
        // Add a method to convert collection to CSV string
        Collection::macro('toCsv', function (array $headers = []) {
            $csv = '';

            if (!empty($headers)) {
                $csv .= implode(',', $headers) . "\n";
            }

            return $this->reduce(function ($csv, $row) {
                if (is_array($row)) {
                    $csv .= implode(',', array_map(function ($value) {
                        // Escape values with commas or quotes
                        if (str_contains($value, ',') || str_contains($value, '"')) {
                            return '"' . str_replace('"', '""', $value) . '"';
                        }
                        return $value;
                    }, $row)) . "\n";
                }
                return $csv;
            }, $csv);
        });

        // Add a method to get percentage of items matching a condition
        Collection::macro('percentageWhere', function ($key, $operator = null, $value = null) {
            $total = $this->count();
            if ($total === 0) {
                return 0;
            }

            $matching = $this->where($key, $operator, $value)->count();
            return round(($matching / $total) * 100, 2);
        });

        // Add a method to safely get nested values
        Collection::macro('deepPluck', function ($keys) {
            return $this->map(function ($item) use ($keys) {
                $result = [];
                foreach ($keys as $key) {
                    $result[$key] = data_get($item, $key);
                }
                return $result;
            });
        });
    }
}
```

### Using Custom Macros

```php
<?php

// Now these methods are available on all Collections

// Generate CSV export
$users = collect([
    ['name' => 'Alice', 'email' => 'alice@example.com', 'role' => 'admin'],
    ['name' => 'Bob', 'email' => 'bob@example.com', 'role' => 'user'],
]);

$csv = $users->toCsv(['Name', 'Email', 'Role']);
// Output:
// Name,Email,Role
// Alice,alice@example.com,admin
// Bob,bob@example.com,user

// Calculate percentages
$orders = collect([
    ['status' => 'completed'],
    ['status' => 'completed'],
    ['status' => 'pending'],
    ['status' => 'completed'],
    ['status' => 'refunded'],
]);

$completionRate = $orders->percentageWhere('status', 'completed');
// Result: 60.00

// Deep pluck from nested structures
$responses = collect([
    ['user' => ['profile' => ['name' => 'Alice', 'avatar' => 'a.jpg']]],
    ['user' => ['profile' => ['name' => 'Bob', 'avatar' => 'b.jpg']]],
]);

$profiles = $responses->deepPluck(['user.profile.name', 'user.profile.avatar']);
```

## Higher-Order Messages

Laravel Collections support a shorthand syntax for common operations called higher-order messages.

```php
<?php

$users = collect([
    new User(['name' => 'Alice', 'active' => true]),
    new User(['name' => 'Bob', 'active' => false]),
    new User(['name' => 'Charlie', 'active' => true]),
]);

// Instead of writing this:
$names = $users->map(function ($user) {
    return $user->name;
});

// You can write:
$names = $users->map->name;

// Instead of:
$users->each(function ($user) {
    $user->sendWelcomeEmail();
});

// You can write:
$users->each->sendWelcomeEmail();

// Filter with higher-order messages
$activeUsers = $users->filter->isActive();

// Combine them
$activeNames = $users->filter->isActive()->map->name;

// Reject inactive and get uppercase names
$result = $users
    ->reject->isInactive()
    ->map->name
    ->map->toUpperCase();
```

## Real-World Examples

Let us look at some practical scenarios where Collections shine.

### Processing Form Submissions

```php
<?php

// Validate and transform form data
$formData = collect(request()->all());

$cleanedData = $formData
    // Remove empty fields
    ->filter(function ($value) {
        return $value !== null && $value !== '';
    })
    // Trim string values
    ->map(function ($value) {
        return is_string($value) ? trim($value) : $value;
    })
    // Only keep allowed fields
    ->only(['name', 'email', 'phone', 'message'])
    // Transform specific fields
    ->merge([
        'email' => strtolower($formData->get('email', '')),
        'phone' => preg_replace('/[^0-9]/', '', $formData->get('phone', '')),
    ]);
```

### Building API Responses

```php
<?php

// Transform Eloquent models for API response
public function index()
{
    $products = Product::with(['category', 'reviews'])->get();

    $response = $products->map(function ($product) {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => Str::slug($product->name),
            'price' => [
                'amount' => $product->price,
                'formatted' => '$' . number_format($product->price, 2),
            ],
            'category' => $product->category->name,
            'rating' => [
                'average' => round($product->reviews->avg('rating'), 1),
                'count' => $product->reviews->count(),
            ],
            'in_stock' => $product->stock > 0,
        ];
    });

    return response()->json([
        'data' => $response,
        'meta' => [
            'total' => $products->count(),
            'categories' => $products->pluck('category.name')->unique()->values(),
        ],
    ]);
}
```

### Analyzing Log Data

```php
<?php

// Parse and analyze application logs
$logLines = LazyCollection::make(function () {
    $handle = fopen(storage_path('logs/laravel.log'), 'r');
    while (($line = fgets($handle)) !== false) {
        yield $line;
    }
    fclose($handle);
});

$errorSummary = $logLines
    // Parse log lines
    ->map(function ($line) {
        if (preg_match('/\[(\d{4}-\d{2}-\d{2})\s[\d:]+\]\s(\w+)\.(\w+):(.*)/', $line, $matches)) {
            return [
                'date' => $matches[1],
                'environment' => $matches[2],
                'level' => $matches[3],
                'message' => trim($matches[4]),
            ];
        }
        return null;
    })
    // Remove unparseable lines
    ->filter()
    // Only errors
    ->filter(function ($log) {
        return $log['level'] === 'ERROR';
    })
    // Group by date
    ->groupBy('date')
    // Count errors per day
    ->map(function ($logs, $date) {
        return [
            'date' => $date,
            'count' => $logs->count(),
            'unique_errors' => $logs->pluck('message')->unique()->count(),
        ];
    })
    ->values()
    ->all();
```

### Implementing Shopping Cart Logic

```php
<?php

class ShoppingCart
{
    protected Collection $items;

    public function __construct()
    {
        $this->items = collect();
    }

    public function add(array $item): void
    {
        // Check if item already exists
        $existing = $this->items->firstWhere('product_id', $item['product_id']);

        if ($existing) {
            // Update quantity
            $this->items = $this->items->map(function ($cartItem) use ($item) {
                if ($cartItem['product_id'] === $item['product_id']) {
                    $cartItem['quantity'] += $item['quantity'];
                }
                return $cartItem;
            });
        } else {
            $this->items->push($item);
        }
    }

    public function getSubtotal(): float
    {
        return $this->items->sum(function ($item) {
            return $item['price'] * $item['quantity'];
        });
    }

    public function getItemCount(): int
    {
        return $this->items->sum('quantity');
    }

    public function getItemsByCategory(): Collection
    {
        return $this->items
            ->groupBy('category')
            ->map(function ($items, $category) {
                return [
                    'category' => $category,
                    'items' => $items,
                    'subtotal' => $items->sum(fn($i) => $i['price'] * $i['quantity']),
                ];
            });
    }

    public function applyDiscount(float $percentage): Collection
    {
        $discount = $percentage / 100;

        return $this->items->map(function ($item) use ($discount) {
            $item['original_price'] = $item['price'];
            $item['price'] = round($item['price'] * (1 - $discount), 2);
            $item['discount_applied'] = true;
            return $item;
        });
    }
}
```

## Performance Considerations

While Collections are powerful, keep these tips in mind for optimal performance.

### When to Use Eager Arrays

For simple operations on small datasets, plain arrays might be faster:

```php
<?php

// For simple operations, arrays can be faster
$numbers = [1, 2, 3, 4, 5];

// Array approach - direct and fast
$doubled = array_map(fn($n) => $n * 2, $numbers);

// Collection approach - more expressive but slight overhead
$doubled = collect($numbers)->map(fn($n) => $n * 2)->all();

// Use Collections when you need chaining or complex operations
// Use arrays for simple, single-pass operations in hot paths
```

### Avoid Unnecessary Conversions

```php
<?php

// Inefficient - converts back and forth
$result = collect($array)->filter(...)->all();
$result = collect($result)->map(...)->all();
$result = collect($result)->sortBy(...)->all();

// Efficient - single chain
$result = collect($array)
    ->filter(...)
    ->map(...)
    ->sortBy(...)
    ->all();
```

### Use Lazy Collections for Large Data

```php
<?php

// Memory hungry - loads all 1 million rows
$results = DB::table('huge_table')->get();

// Memory efficient - processes one at a time
DB::table('huge_table')->cursor()->each(function ($row) {
    processRow($row);
});
```

## Debugging Collections

Laravel provides helpful methods for inspecting Collections during development.

```php
<?php

$users = collect([
    ['name' => 'Alice', 'role' => 'admin'],
    ['name' => 'Bob', 'role' => 'user'],
]);

// Dump the collection and continue
$users->dump();

// Dump and die - stops execution
$users->dd();

// Use tap() to inspect mid-chain without interrupting
$result = $users
    ->filter(fn($u) => $u['role'] === 'admin')
    ->tap(function ($collection) {
        // Log or inspect without modifying
        Log::debug('Filtered users:', $collection->all());
    })
    ->map(fn($u) => $u['name']);

// Convert to array for var_dump or print_r
var_dump($users->toArray());

// Get JSON representation
echo $users->toJson(JSON_PRETTY_PRINT);
```

## Conclusion

Laravel Collections transform the way you work with data in PHP. By replacing imperative loops with declarative method chains, your code becomes more readable, testable, and maintainable. The key concepts to remember are:

1. Use `collect()` to wrap arrays and unlock powerful manipulation methods
2. Chain transformations like `map()`, `filter()`, and `reduce()` for clean data pipelines
3. Group and organize data with `groupBy()`, `keyBy()`, and `partition()`
4. Process large datasets efficiently with Lazy Collections
5. Extend functionality with custom macros when needed

Start small by replacing one or two array operations with Collection methods, and gradually you will find yourself reaching for Collections whenever you work with data. The fluent interface becomes second nature, and you will wonder how you ever managed without it.

---

## Monitor Your Laravel Application with OneUptime

Building great Laravel applications means writing clean, maintainable code - but it also means knowing when things go wrong in production. While Collections help you write better code, **OneUptime** helps you keep that code running smoothly.

With OneUptime, you can:

- **Monitor your Laravel endpoints** for uptime and response time
- **Track errors and exceptions** before your users report them
- **Set up alerts** for slow database queries and memory issues
- **Create status pages** to keep your users informed during incidents
- **Analyze performance trends** to catch problems before they escalate

Your elegant Collection pipelines deserve robust monitoring. Try OneUptime free at [oneuptime.com](https://oneuptime.com) and ship Laravel applications with confidence.
