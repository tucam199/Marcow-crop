import React from 'react';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import CenterCanvas from './components/CenterCanvas';

export default function MarcowApp() {
  return (
    <div className="h-screen w-full flex bg-[#FAF9F6] text-[#2D2D2D] font-sans overflow-hidden">
      <LeftSidebar />
      <CenterCanvas />
      <RightSidebar />
    </div>
  );
}
