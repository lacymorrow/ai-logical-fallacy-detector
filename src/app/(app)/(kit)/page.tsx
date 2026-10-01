import { OnboardingView } from "@/app/(app)/(kit)/_components/onboarding-view";
import { ShipkitIoView } from "@/app/(app)/(kit)/_shipkit-io-components/shipkit-io-view";
import { constructMetadata, routeMetadata } from "@/config/metadata";
import { isShipkitIo } from "@/lib/utils/url-utils";

export const metadata = constructMetadata(routeMetadata.home);

export default function ShipkitHomePage() {
  if (isShipkitIo) {
    return <ShipkitIoView />;
  }
  return <OnboardingView />;
}
