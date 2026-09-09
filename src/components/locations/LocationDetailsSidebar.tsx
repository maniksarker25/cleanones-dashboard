"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MdAccessTime, MdAdd, MdOutlineClose, MdOutlineLocationOn, MdOutlinePeople } from "react-icons/md";
import { TbBuilding, TbDoor } from "react-icons/tb";
import { Location } from "./types";
import type { Room } from "@/components/rooms/types";
import { RoomCard } from "@/components/rooms/RoomCard";
import { getLocationCleaningPlans, getLocationOverview, type LocationCleaningPlans, type LocationOverview } from "@/services/actions/locations";
import { getRooms, type RoomGridItem } from "@/services/actions/rooms";
import { CardGridSkeleton, DetailSkeleton } from "@/components/shared/SkeletonLoader";

const RoomDetailSidebar = dynamic(() => import("@/components/rooms/RoomDetailsSidebar").then((mod) => mod.RoomDetailSidebar), { ssr: false });
const AddRoomModal = dynamic(() => import("@/components/rooms/AddRoomModal").then((mod) => mod.AddRoomModal), { ssr: false });

interface LocationDetailSidebarProps { location: Location; onClose: () => void; }
type Tab = "overview" | "rooms" | "plans";

const titleCase = (value?: string) => (value ? value.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Standard");
const toRoom = (item: RoomGridItem, location: Location): Room => ({ id: item.room_id, name: item.room_name, type: titleCase(item.room_type), location: location.name, floor: "", duration: 0, photos: item.total_photos_required || item.photo_number, tasks: item.task_number, cleaningPlan: titleCase(item.clean_type) });

export function LocationDetailSidebar({ location, onClose }: LocationDetailSidebarProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<LocationOverview | null>(null);
  const [rooms, setRooms] = useState<RoomGridItem[] | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [plans, setPlans] = useState<LocationCleaningPlans | null>(null);
  const [error, setError] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
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
  return <>
    <div className="modal-backdrop fixed inset-0 z-[60]" onClick={onClose} />
    <div className="fixed right-0 top-0 z-[65] flex h-dvh w-full max-w-[430px] flex-col border-l border-gray-200 bg-white animate-in slide-in-from-right duration-200">
      <div className="flex items-center gap-3 border-b border-gray-700 bg-[#1A2332] px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded bg-sky-100"><TbBuilding className="text-lg text-sky-600" /></span>
        <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold text-white">{location.name}</h2><p className="mt-0.5 text-[10px] text-slate-300">{location.client} · {location.id}</p></div>
        <button onClick={onClose} className="p-1 text-slate-300 hover:text-white"><MdOutlineClose className="text-lg" /></button>
      </div>
      <div className="grid grid-cols-3 border-b border-gray-200 bg-white px-3 pt-2">
        {([["overview", "Overview"], ["rooms", `Rooms (${location.rooms})`], ["plans", "Cleaning plans"]] as const).map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`border-b-2 px-2 py-2 text-[10px] font-semibold ${tab === value ? "border-sky-500 text-sky-600" : "border-transparent text-slate-500"}`}>{label}</button>)}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {error && <p className="mb-3 rounded bg-red-50 p-2 text-xs text-red-700">{error}</p>}
        {tab === "overview" && <div className="space-y-3">
          <Info icon={<MdOutlineLocationOn />} label="Address" value={overview?.address ?? location.address} />
          <div className="grid grid-cols-3 gap-2">
            <Stat value={overview?.floors ?? location.floors} label="Floors" />
            <Stat value={overview?.rooms ?? location.rooms} label="Rooms" />
            <Stat value={overview?.required_hours_month ?? `${location.requiredHours}h`} label="Required / month" />
          </div>
          <section className="rounded border border-gray-200">
            <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5"><MdOutlinePeople className="text-sky-500" /><div><h3 className="text-xs font-semibold text-slate-800">Assigned employees</h3><p className="text-[10px] text-slate-500">Default team for this location</p></div><span className="ml-auto text-[10px] font-semibold text-slate-500">{location.assignedEmployees.length}</span></div>
            <div className="divide-y divide-gray-100">{(overview?.assigned_employees ?? []).map((employee) => <div key={employee.worker_id} className="flex items-center gap-2.5 px-3 py-2.5"><img src={employee.profile_picture || "/avatar-placeholder.svg"} alt={employee.name} className="h-7 w-7 rounded-full border border-slate-200 object-cover" /><span className="text-xs font-medium text-slate-700">{employee.name}</span><span className="ml-auto rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">{employee.status}</span></div>)}</div>
          </section>
          <Info icon={<MdAccessTime />} label="Coverage" value={overview?.coverage_label ?? `${location.requiredHours} required hours per month`} />
        </div>}
        {tab === "rooms" && <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Rooms at {location.name}</h3>
              <p className="text-[10px] text-slate-500">Click a room to see its tasks.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddRoom(true)}
              className="flex h-8 shrink-0 items-center gap-1 rounded bg-sky-500 px-3 text-[11px] font-semibold text-white hover:bg-sky-600"
            >
              <MdAdd className="text-sm" /> Add room
            </button>
          </div>
          {roomsLoading ? (
            <CardGridSkeleton cards={4} />
          ) : !rooms?.length ? (
            <div className="flex flex-col items-center justify-center rounded border border-dashed border-gray-200 bg-slate-50 py-10 text-center">
              <TbDoor className="mb-2 text-3xl text-gray-300" />
              <p className="text-xs font-semibold text-gray-500">No rooms yet</p>
              <p className="mt-0.5 text-[10px] text-gray-400">Add the first room for this location.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {rooms.map((room) => (
                <RoomCard
                  key={room.room_id}
                  room={toRoom(room, location)}
                  onClick={() => setSelectedRoom(toRoom(room, location))}
                  isSelected={selectedRoom?.id === room.room_id}
                />
              ))}
            </div>
          )}
        </div>}
        {tab === "plans" && <div className="space-y-2">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Cleaning plans</h3>
              <p className="text-[10px] text-slate-500">Plans linked to this location and its rooms.</p>
            </div>
            {typeof plans?.total_plans_count === "number" && (
              <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-semibold text-sky-600">
                {plans.total_plans_count} total
              </span>
            )}
          </div>
          {plans == null ? <DetailSkeleton blocks={3} /> : (plans.plans ?? []).length === 0 ? (
            <p className="rounded border border-dashed border-gray-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
              No cleaning plans linked to this location yet.
            </p>
          ) : (
            <div className="space-y-2">
              {(plans.plans ?? []).map((plan) => (
                <div key={plan.plan_id} className="rounded border border-gray-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">{plan.title || plan.plan_id}</p>
                      {plan.subtitle && <p className="mt-0.5 text-[10px] text-slate-400">{plan.subtitle}</p>}
                    </div>
                    {plan.status && (
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${plan.status.toLowerCase() === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                        {plan.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[10px] text-slate-300" title={plan.plan_id}>{plan.plan_id}</p>
                </div>
              ))}
            </div>
          )}
          <Link href="/cleaning-plans" className="mt-3 flex h-9 items-center justify-center rounded border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-700">Manage cleaning plans</Link>
        </div>}
      </div>
    </div>
    {selectedRoom && <RoomDetailSidebar room={selectedRoom} onClose={() => setSelectedRoom(null)} />}
    {showAddRoom && (
      <AddRoomModal
        presetLocation={{ id: location.id, name: location.name }}
        onClose={() => setShowAddRoom(false)}
        onAdd={() => { setShowAddRoom(false); loadRooms(); }}
      />
    )}
  </>;
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-3 rounded border border-gray-200 bg-gray-50/60 p-3"><span className="mt-0.5 text-lg text-sky-500">{icon}</span><div><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-xs font-medium text-slate-700">{value}</p></div></div>;
}
function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return <div className="rounded border border-gray-200 p-3 text-center"><p className="text-base font-semibold text-slate-800">{value}</p><p className="mt-0.5 text-[9px] text-slate-500">{label}</p></div>;
}
