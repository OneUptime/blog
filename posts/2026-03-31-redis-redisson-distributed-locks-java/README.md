# How to Use Redisson Distributed Locks in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Redisson

Description: Learn how to use Redisson RLock and RReadWriteLock to implement distributed locking in Java applications backed by Redis.

---

Distributed locks prevent race conditions when multiple JVM instances compete for a shared resource. Redisson provides `RLock`, `RReadWriteLock`, and `RFencedLock` - all backed by Redis - with automatic lease renewal and deadlock protection.

## Basic RLock Usage

```java
RLock lock = client.getLock("resource:product:42");

lock.lock(); // blocks until acquired
try {
    // critical section
    updateInventory(42);
} finally {
    lock.unlock();
}
```

## Lock with Timeout (Recommended for Production)

```java
RLock lock = client.getLock("order:processing:lock");

boolean acquired = lock.tryLock(5, 30, TimeUnit.SECONDS);
// tryLock(waitTime, leaseTime, unit)
// waitTime  - max time to wait for the lock
// leaseTime - auto-release after this duration

if (acquired) {
    try {
        processOrder();
    } finally {
        lock.unlock();
    }
} else {
    System.out.println("Could not acquire lock, try again later");
}
```

## Async Lock Acquisition

```java
RLock lock = client.getLock("async:lock");
RFuture<Boolean> future = lock.tryLockAsync(3, 10, TimeUnit.SECONDS);

future.whenComplete((result, exception) -> {
    if (result) {
        try {
            doWork();
        } finally {
            lock.unlockAsync();
        }
    }
});
```

## Read/Write Lock

Use `RReadWriteLock` when multiple readers are safe but writes must be exclusive:

```java
RReadWriteLock rwLock = client.getReadWriteLock("config:lock");

// Multiple threads can hold read lock simultaneously
rwLock.readLock().lock();
try {
    String value = readConfig();
} finally {
    rwLock.readLock().unlock();
}

// Only one thread can hold write lock at a time
rwLock.writeLock().lock();
try {
    updateConfig("newValue");
} finally {
    rwLock.writeLock().unlock();
}
```

## Fair Lock

```java
RLock fairLock = client.getFairLock("fair:resource:lock");
// Threads acquire the lock in the order they requested it
fairLock.lock();
try {
    processInOrder();
} finally {
    fairLock.unlock();
}
```

## MultiLock - Lock Multiple Resources Atomically

```java
RLock lock1 = client.getLock("account:1:lock");
RLock lock2 = client.getLock("account:2:lock");

RLock multiLock = client.getMultiLock(lock1, lock2);
multiLock.lock();
try {
    transfer(account1, account2, amount);
} finally {
    multiLock.unlock();
}
```

Redisson automatically renews the lease through a watchdog mechanism when no explicit `leaseTime` is set (e.g., `lock.lock()` or `lock.tryLock(waitTime)`). The watchdog prolongs the lock while the JVM holding it is alive. When an explicit `leaseTime` is provided, such as `tryLock(5, 30, TimeUnit.SECONDS)`, the watchdog is disabled and the lock auto-releases after the specified duration. Always use `finally` to ensure `unlock()` is called even if an exception occurs.

## Summary

Redisson `RLock` provides distributed mutual exclusion backed by Redis with automatic lease renewal. The `tryLock` variant with explicit wait and lease times is the safest pattern for production code. `RReadWriteLock` and `MultiLock` (via `getMultiLock()`) address more advanced scenarios like concurrent reads or atomic multi-resource locking.
