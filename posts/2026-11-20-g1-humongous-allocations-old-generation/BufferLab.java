public class BufferLab {
  static volatile Object keep;
  public static void main(String[] args) {
    Object[] ring = new Object[8];
    for (int i=0; i<1000; i++) {
      if (args[0].equals("large")) {
        ring[i % ring.length] = new byte[700 * 1024];
      } else {
        byte[][] chunks = new byte[6][];
        for (int c=0;c<5;c++) chunks[c]=new byte[128 * 1024];
        chunks[5]=new byte[60 * 1024];
        ring[i % ring.length] = chunks;
      }
      keep = ring;
    }
    System.out.println("Completed " + args[0]);
  }
}
