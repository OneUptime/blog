# Validation Summary: How to Fix 'Invalid operation' Collection Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- .NET
- C#
- `List<T>` and `Dictionary<TKey, TValue>`
- LINQ deferred execution
- `System.Collections.Concurrent`
- `ObservableCollection<T>` with WPF dispatcher usage
- `System.Collections.Immutable`
- `ReaderWriterLockSlim`

## Sources Consulted
- Microsoft Learn: `InvalidOperationException` class - https://learn.microsoft.com/en-us/dotnet/api/system.invalidoperationexception
- Microsoft Learn: `List<T>.Enumerator.MoveNext` - https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.enumerator.movenext
- Microsoft Learn: `List<T>.RemoveAll` - https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.removeall
- Microsoft Learn: `Dictionary<TKey,TValue>.Enumerator.MoveNext` - https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2.enumerator.movenext
- Microsoft Learn: `Dictionary<TKey,TValue>.Remove` - https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2.remove
- Microsoft Learn: Thread-safe collections - https://learn.microsoft.com/en-us/dotnet/standard/collections/thread-safe/
- Microsoft Learn: `ConcurrentDictionary<TKey,TValue>.Keys` - https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentdictionary-2.keys
- Microsoft Learn: LINQ deferred execution and lazy evaluation - https://learn.microsoft.com/en-us/dotnet/standard/linq/deferred-execution-lazy-evaluation
- Microsoft Learn: `ObservableCollection<T>` - https://learn.microsoft.com/en-us/dotnet/api/system.collections.objectmodel.observablecollection-1
- Microsoft Learn: WPF `Dispatcher.InvokeAsync` - https://learn.microsoft.com/en-us/dotnet/api/system.windows.threading.dispatcher.invokeasync
- Microsoft Learn: `ReaderWriterLockSlim` - https://learn.microsoft.com/en-us/dotnet/api/system.threading.readerwriterlockslim
- Microsoft Learn: `ImmutableList<T>.Add` - https://learn.microsoft.com/en-us/dotnet/api/system.collections.immutable.immutablelist-1.add

## Issues Found
- The dictionary example stated unconditionally that `Dictionary<TKey, TValue>.Remove` during enumeration throws. Microsoft documentation notes that in .NET Core 3.0 and later, `Remove` and `Clear` do not invalidate active dictionary enumerators, though this does not imply thread safety. Updated the text and comment to qualify the behavior by runtime version and describe the collect-keys pattern as cross-version compatible.
- The LINQ deferred-execution example said the output "depends on timing" after modifications made before enumeration in a single-threaded snippet. The result actually reflects the source collection at enumeration time. Updated the comment to say the query results reflect the modified source collection.

## Review Notes
The code snippets use modern C# syntax such as target-typed `new()` and nullable reference syntax, so they assume a current C# compiler. The `ObservableCollection<T>` section correctly demonstrates WPF dispatcher marshalling, but the heading also mentions MAUI; a future expansion could add a MAUI-specific dispatcher example.
