import { NextRequest, NextResponse } from "next/server";

const HARVEST_BASE = "https://api.harvestapp.com/v2";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint");
  const token = req.headers.get("x-harvest-token");
  const accountId = req.headers.get("x-harvest-account-id");

  if (!endpoint || !token || !accountId) {
    return NextResponse.json(
      { error: "Missing endpoint, token, or account ID" },
      { status: 400 }
    );
  }

  // Forward remaining query params to Harvest
  const forwardParams = new URLSearchParams(searchParams);
  forwardParams.delete("endpoint");
  const qs = forwardParams.toString();

  const url = `${HARVEST_BASE}${endpoint}${qs ? `?${qs}` : ""}`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Harvest-Account-Id": accountId,
      "User-Agent": "NP-Harvest-Dashboard (bmay@nationalpositions.com)",
    },
  });

  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}
