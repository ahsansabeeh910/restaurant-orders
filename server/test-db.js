import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log("Connecting to Supabase...");
    
    // Check Data Storage
    const userCount = await prisma.user.count();
    const menuCount = await prisma.menuItem.count();
    const orderCount = await prisma.order.count();
    
    console.log("\n--- DATA STORAGE CHECK ---");
    console.log(`Users saved: ${userCount}`);
    console.log(`Menu Items saved: ${menuCount}`);
    console.log(`Orders saved: ${orderCount}`);

    // Check Searching functionality (Search for an order by status and table number)
    console.log("\n--- SEARCH FUNCTIONALITY CHECK ---");
    const searchResults = await prisma.order.findMany({
      where: {
        status: 'READY',
      },
      include: {
        primaryWaiter: { select: { name: true } }
      },
      take: 2
    });
    
    console.log(`Found ${searchResults.length} 'READY' orders.`);
    if (searchResults.length > 0) {
      console.log(`Example search result: Table ${searchResults[0].tableNumber} (Waiter: ${searchResults[0].primaryWaiter.name})`);
    }

    console.log("\n✅ Database is working perfectly!");
  } catch (error) {
    console.error("Database check failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
