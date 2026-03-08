import { currentUser } from "@clerk/nextjs/server";

export type SubscriptionPlan = "free_user" | "pro";

export interface SubscriptionStatus {
    hasSubscription: boolean;
    plan: SubscriptionPlan | null;
    isPro: boolean;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const user = await currentUser();

    if (!user) {
        return {
            hasSubscription: false,
            plan: null,
            isPro: false,
        };
    }

    // Check for subscription metadata from Clerk
    const publicMetadata = user.publicMetadata as { subscription?: string } | undefined;
    const subscription = publicMetadata?.subscription;

    // Check private metadata for subscription (set by webhooks)
    const privateMetadata = user.privateMetadata as { subscription?: string } | undefined;
    const privateSubscription = privateMetadata?.subscription;

    const plan = (subscription || privateSubscription || "free_user") as SubscriptionPlan;

    return {
        hasSubscription: true,
        plan,
        isPro: plan === "pro",
    };
}

export async function requireProSubscription(): Promise<boolean> {
    const { isPro } = await getSubscriptionStatus();
    return isPro;
}
