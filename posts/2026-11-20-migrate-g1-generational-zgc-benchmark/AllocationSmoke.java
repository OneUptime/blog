public class AllocationSmoke {
    static volatile Object retained;
    public static void main(String[] args) {
        byte[][] ring = new byte[256][];
        for (int i = 0; i < 20000; i++) {
            ring[i % ring.length] = new byte[32 * 1024];
        }
        retained = ring;
        System.out.println("allocation smoke complete");
    }
}
