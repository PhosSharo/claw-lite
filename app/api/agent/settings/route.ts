import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/user";
import { updateHeartbeatInterval } from "@/lib/db/queries";

const VALID_INTERVALS = [5, 10, 15, 30, 60];

export async function PATCH(request: NextRequest) {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByClerkId(clerkId);
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { heartbeatInterval } = await request.json();

    if (!VALID_INTERVALS.includes(heartbeatInterval)) {
        return NextResponse.json(
            { error: `Invalid interval. Must be one of: ${VALID_INTERVALS.join(", ")}` },
            { status: 400 }
        );
    }

    await updateHeartbeatInterval(user.id, heartbeatInterval);

    return NextResponse.json({ success: true, heartbeatInterval });
}
