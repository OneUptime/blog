Console.WriteLine($"runtime={Environment.Version}");
foreach (var item in GC.GetConfigurationVariables())
    if (item.Key.Contains("Limit") || item.Key.Contains("High"))
        Console.WriteLine($"{item.Key}={item.Value}");
GC.Collect(); // Lab-only: obtain collection-based information.
var info = GC.GetGCMemoryInfo();
Console.WriteLine($"available={info.TotalAvailableMemoryBytes}");
Console.WriteLine($"high threshold={info.HighMemoryLoadThresholdBytes}");
Console.WriteLine($"heap={info.HeapSizeBytes}");
