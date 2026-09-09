"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MdAccessTime, MdAdd, MdChevronRight, MdOutlineLocationOn, MdOutlinePeople } from "react-icons/md";
import { TbBuilding, TbDoor } from "react-icons/tb";
import type { Location } from "@/components/locations/types";
import type { Room } from "@/components/rooms/types";
import { RoomCard } from "@/components/rooms/RoomCard";
import { getLocationCleaningPlans, getLocationOverview, type LocationCleaningPlans, type LocationOverview } from "@/services/actions/locations";
import { getRooms, type RoomGridItem } from "@/services/actions/rooms";
import { CardGridSkeleton, DetailSkeleton } from "@/components/shared/SkeletonLoader";

const AddRoomModal = dynamic(() => import("@/components/rooms/AddRoomModal").then((mod) => mod.AddRoomModal), { ssr: false });

type Tab = "overview" | "rooms" | "plans";

const titleCase = (value?: string) => (value ? value.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Standard");
const toRoom = (item: RoomGridItem, locationName: string): Room => ({ id: item.room_id, name: item.room_name, type: titleCase(item.room_type), location: locationName, floor: "", duration: 0, photos: item.total_photos_required || item.photo_number, tasks: item.task_number, cleaningPlan: titleCase(item.clean_type) });

export function LocationOverviewPanel({ location, onBackToLocations, onOpenRoom }: { location: Location; onBackToLocations: () => void; onOpenRoom: (room: Room) => void }) {
  const [tab, setTab] = useState<Tab>("rooms");
  const [overview, setOverview] = useState<LocationOverview | null>(null);
  const [rooms, setRooms] = useState<RoomGridItem[] | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [plans, setPlans] = useState<LocationCleaningPlans | null>(null);
  const [error, setError] = useState("");
  const [showAddRoom, setShowAddRoom] = useState(false);

  const loadRooms = useCallback(() => {
    setRoomsLoading(true);
    void getRooms({ locationId: location.id, limit: 100 }).then((result) => {
      setRoomsLoading(false);
      if (result.success) return setRooms(result.data.rooms);
      setError(result.error);
    });
  }, [location.id]);

  useEffect(() => {
    setError("");
    if (tab === "overview") void getLocationOverview(location.id).then((result) => result.success ? setOverview(result.data) : setError(result.error));
    if (tab === "rooms") loadRooms();
    if (tab === "plans") void getLocationCleaningPlans(location.id).then((result) => result.success ? setPlans(result.data) : setError(result.error));
  }, [location.id, tab, loadRooms]);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1 text-xs font-medium text-slate-400">
        <button type="button" onClick={onBackToLocations} className="hover:text-sky-600">Locations</button>
        <MdChevronRight className="text-sm" />
        <span className="font-semibold text-slate-700">{location.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-50">
          <TbBuilding className="text-xl text-sky-600" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-slate-900">{location.name}</h2>
          <p className="truncate text-xs text-slate-400">{location.address}</p>
        </div>
        <button type="button" onClick={onBackToLocations} className="shrink-0 rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Back to locations
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([["overview", "Overview"], ["rooms", `Rooms (${location.rooms})`], ["plans", "Cleaning plans"]] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`border-b-2 px-3.5 py-2.5 text-xs font-semibold transition-colors ${tab === value ? "border-sky-500 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">{error}</p>}

      {tab === "overview" && (
        <div className="grid gap-3 md:grid-cols-2">
          <Info icon={<MdOutlineLocationOn />} label="Address" value={overview?.address ?? location.address} />
          <div className="grid grid-cols-3 gap-2 md:col-span-2">
            <Stat value={overview?.floors ?? location.floors} label="Floors" />
            <Stat value={overview?.rooms ?? location.rooms} label="Rooms" />
            <Stat value={overview?.required_hours_month ?? `${location.requiredHours}h`} label="Required / month" />
          </div>
          <section className="rounded-lg border border-gray-200 bg-white md:col-span-2">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
              <MdOutlinePeople className="text-sky-500" />
              <div>
                <h3 className="text-xs font-semibold text-slate-800">Assigned employees</h3>
                <p className="text-[10px] text-slate-500">Default team for this location</p>
              </div>
              <span className="ml-auto text-[10px] font-semibold text-slate-500">{overview?.assigned_employees?.length ?? location.assignedEmployees.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {(overview?.assigned_employees ?? []).map((employee) => (
                <div key={employee.worker_id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <img src={employee.profile_picture || "/avatar-placeholder.svg"} alt={employee.name} className="h-7 w-7 rounded-full border border-slate-200 object-cover" />
                  <span className="text-xs font-medium text-slate-700">{employee.name}</span>
                  <span className="ml-auto rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">{employee.status}</span>
                </div>
              ))}
              {overview && !overview.assigned_employees?.length && <p className="px-4 py-4 text-center text-xs text-slate-400">No employees assigned yet.</p>}
            </div>
          </section>
          <Info icon={<MdAccessTime />} label="Coverage" value={overview?.coverage_label ?? `${location.requiredHours} required hours per month`} />
        </div>
      )}

      {tab === "rooms" && (
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowAddRoom(true)}
              className="flex h-9 items-center gap-1.5 rounded bg-sky-500 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600"
            >
              <MdAdd className="text-base" /> Add room
            </button>
          </div>
          {roomsLoading ? (
            <CardGridSkeleton cards={6} />
          ) : !rooms?.length ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-slate-50 py-16 text-center">
              <TbDoor className="mb-2 text-4xl text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">No rooms yet</p>
              <p className="mt-0.5 text-xs text-gray-400">Add the first room for this location.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rooms.map((room) => (
                <RoomCard key={room.room_id} room={toRoom(room, location.name)} onClick={() => onOpenRoom(toRoom(room, location.name))} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "plans" && (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-slate-500">Plans linked to this location and its rooms.</p>
            {typeof plans?.total_plans_count === "number" && (
              <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-semibold text-sky-600">{plans.total_plans_count} total</span>
            )}
          </div>
          {plans == null ? (
            <DetailSkeleton blocks={3} />
          ) : (plans.plans ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-slate-50 py-16 text-center">
              <p className="text-sm font-semibold text-gray-500">No cleaning plans yet</p>
              <p className="mt-0.5 text-xs text-gray-400">No cleaning plans are linked to this location yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(plans.plans ?? []).map((plan) => (
                <div key={plan.plan_id} className="rounded-lg border border-gray-200 bg-white p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-semibold text-slate-800">{plan.title || plan.plan_id}</p>
                    {plan.status && (
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${plan.status.toLowerCase() === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                        {plan.status}
                      </span>
                    )}
                  </div>
                  {plan.subtitle && <p className="mt-0.5 text-[10px] text-slate-400">{plan.subtitle}</p>}
                  <p className="mt-1.5 truncate text-[10px] text-slate-300" title={plan.plan_id}>{plan.plan_id}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddRoom && (
        <AddRoomModal
          presetLocation={{ id: location.id, name: location.name }}
          onClose={() => setShowAddRoom(false)}
          onAdd={() => { setShowAddRoom(false); loadRooms(); }}
        />
      )}
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3.5">
      <span className="mt-0.5 text-lg text-sky-500">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}
function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
      <p className="text-base font-semibold text-slate-800">{value}</p>
      <p className="mt-0.5 text-[9px] text-slate-500">{label}</p>
    </div>
  );
}
