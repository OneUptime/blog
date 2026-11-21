var retained = new byte[16][];
for (int i = 0; i < retained.Length; i++) retained[i] = new byte[1024 * 1024];
Console.WriteLine($"ready pid={Environment.ProcessId}");
await Task.Delay(TimeSpan.FromSeconds(60));
GC.KeepAlive(retained);
