using System.Runtime;
Console.WriteLine($"runtime={Environment.Version}");
Console.WriteLine($"processors={Environment.ProcessorCount}");
Console.WriteLine($"serverGC={GCSettings.IsServerGC}");
Console.WriteLine($"latencyMode={GCSettings.LatencyMode}");
