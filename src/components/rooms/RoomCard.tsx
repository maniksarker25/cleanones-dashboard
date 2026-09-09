"use client";

import React from "react";
import { TbCamera, TbChecklist, TbClock, TbDoor } from "react-icons/tb";
import { Room, RoomType } from "./types";

export const roomTypeColors: Record<RoomType, { text: string; bg: string }> = {
    Standard: { text: "text-[#0ea5e9]", bg: "bg-[#e0f2fe]" },
    Deluxe: { text: "text-purple-500", bg: "bg-purple-50" },
    Suite: { text: "text-amber-500", bg: "bg-amber-50" },
    "Junior Suite": { text: "text-pink-500", bg: "bg-pink-50" },
};

interface RoomCardProps {
    room: Room;
    onClick: () => void;
    isSelected?: boolean;
}

export function RoomCard({ room, onClick, isSelected }: RoomCardProps) {
    const colors = roomTypeColors[room.type] ?? roomTypeColors.Standard;

    return (
        <div
            onClick={onClick}
            className={`dashboard-card flex h-full cursor-pointer flex-col justify-between transition-[border-color,box-shadow] hover:border-[#d7dbe4] hover:shadow ${isSelected ? "border-[#0ea5e9]/50 shadow ring-1 ring-[#0ea5e9]/20" : ""
                }`}
        >
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Card Header */}
                <div className="flex items-start gap-2.5 px-3.5 pt-3 pb-2">
                    <div className={`mt-0.5 h-8 w-8 shrink-0 rounded ${colors.bg} flex items-center justify-center`}>
                        <TbDoor className={`${colors.text} text-base`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold leading-tight text-gray-900">{room.name}</p>
                        <p className={`mt-0.5 text-[10px] font-medium ${colors.text}`}>{room.type}</p>
                    </div>
                </div>

                {/* Location + Floor */}
                <div className="px-3.5 pb-2.5">
                    <p className="truncate text-xs font-medium text-gray-700">{room.location}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{room.floor}</p>
                </div>

                <div className="mx-3.5 border-t border-gray-100" />

                {/* Stats */}
                <div className="mt-auto grid grid-cols-3 divide-x divide-gray-100">
                    <div className="flex flex-col items-center gap-0.5 py-2">
                        <TbClock className="text-sm text-gray-300" />
                        <p className="text-xs font-bold text-gray-800">{room.duration}m</p>
                        <p className="text-[10px] text-gray-400">Duration</p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 py-2">
                        <TbCamera className="text-sm text-gray-300" />
                        <p className="text-xs font-bold text-gray-800">{room.photos}</p>
                        <p className="text-[10px] text-gray-400">Photos</p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 py-2">
                        <TbChecklist className="text-sm text-gray-300" />
                        <p className="text-xs font-bold text-gray-800">{room.tasks}</p>
                        <p className="text-[10px] text-gray-400">Tasks</p>
                    </div>
                </div>
            </div>

            <div className="mx-3.5 border-t border-gray-100" />

            {/* Cleaning Plan */}
            <div className="mt-auto px-3.5 py-2">
                <p className={`text-xs font-semibold ${colors.text}`}>{room.cleaningPlan}</p>
            </div>
        </div>
    );
}
