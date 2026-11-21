import java.nio.ByteBuffer;
import java.lang.management.BufferPoolMXBean;
import java.lang.management.ManagementFactory;

public class DirectLab {
    static void allocateOne() {
        ByteBuffer buffer = ByteBuffer.allocateDirect(1024 * 1024);
        buffer.put(0, (byte) 1);
    }
    public static void main(String[] args) {
        if (args[0].equals("explicit")) {
            System.gc();
            System.out.println("explicit request returned");
            return;
        }
        int completed = 0;
        try {
            for (; completed < 40; completed++) allocateOne();
        } finally {
            System.out.println("completed=" + completed);
            for (BufferPoolMXBean pool : ManagementFactory.getPlatformMXBeans(BufferPoolMXBean.class)) {
                if (pool.getName().equals("direct")) {
                    System.out.println("direct capacity=" + pool.getTotalCapacity());
                }
            }
        }
    }
}
