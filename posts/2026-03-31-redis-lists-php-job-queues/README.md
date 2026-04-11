# How to Use Redis Lists in PHP for Job Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PHP, List, Job Queue, Worker

Description: Learn how to use Redis Lists in PHP to build reliable job queues with producers and consumers using LPUSH, BRPOP, and reliable queue patterns.

---

Redis Lists are doubly linked lists that support efficient push and pop operations at both ends. They are the natural data structure for building job queues where producers add work and consumers process it.

## Basic Queue Operations

```php
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

// Producer: push jobs to the queue
function enqueue(Redis $redis, string $queue, array $job): void
{
    $redis->lPush($queue, json_encode($job));
}

// Consumer: pop a job from the queue
function dequeue(Redis $redis, string $queue): ?array
{
    $payload = $redis->rPop($queue);
    return $payload ? json_decode($payload, true) : null;
}

enqueue($redis, 'email:queue', ['to' => 'bob@example.com', 'subject' => 'Welcome']);
$job = dequeue($redis, 'email:queue');
```

## Blocking Pop for Efficient Consumers

`BRPOP` blocks until a job is available, eliminating the need for polling:

```php
// Worker process
while (true) {
    // Blocks up to 30 seconds for a job
    $result = $redis->brPop(['email:queue', 'sms:queue'], 30);

    if ($result === false) {
        // Timeout - loop again
        continue;
    }

    [$queueName, $payload] = $result;
    $job = json_decode($payload, true);

    processJob($queueName, $job);
}

function processJob(string $queue, array $job): void
{
    echo "Processing from $queue: " . json_encode($job) . PHP_EOL;
    // Do actual work here
}
```

## Reliable Queue with Processing List

A plain RPOP loses jobs if the worker crashes. Use a "processing" list for reliability:

```php
function dequeueReliable(Redis $redis, string $queue, string $processingQueue): ?array
{
    // Atomically move from queue to processing
    $payload = $redis->lMove($queue, $processingQueue, 'RIGHT', 'LEFT');
    return $payload ? json_decode($payload, true) : null;
}

function ackJob(Redis $redis, string $processingQueue, array $job): void
{
    // Remove from processing after successful completion
    $redis->lRem($processingQueue, json_encode($job), 1);
}

$job = dequeueReliable($redis, 'email:queue', 'email:processing');
if ($job) {
    // process...
    ackJob($redis, 'email:processing', $job);
}
```

## Queue Length and Inspection

```php
$length = $redis->lLen('email:queue');
echo "Jobs pending: $length\n";

// Peek at the next job without removing it
$next = $redis->lIndex('email:queue', -1); // last element (next to be processed)

// View first 10 jobs
$jobs = $redis->lRange('email:queue', 0, 9);
foreach ($jobs as $job) {
    print_r(json_decode($job, true));
}
```

## Priority Queue with Multiple Lists

```php
// Multiple queues with priority
$queues = ['critical:queue', 'high:queue', 'normal:queue'];

$result = $redis->brPop($queues, 10);
if ($result) {
    [$priorityQueue, $payload] = $result;
    echo "Processing from $priorityQueue\n";
}
```

## Dead Letter Queue

```php
function moveToDeadLetter(Redis $redis, array $job, string $reason): void
{
    $failed = array_merge($job, [
        'failed_at' => date('c'),
        'reason'    => $reason,
    ]);
    $redis->lPush('dead:letter', json_encode($failed));
    $redis->lTrim('dead:letter', 0, 999); // keep last 1000 failures
}
```

## Summary

Redis Lists in PHP provide a simple and fast foundation for job queues. Use LPUSH for producers and BRPOP for blocking consumers. The reliable queue pattern with a processing list prevents job loss during crashes, and dead letter queues capture failed jobs for investigation.
