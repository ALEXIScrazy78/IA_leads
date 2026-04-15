"use client";
import LeadForm from '@/components/LeadForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-8">
        Sistema de Inteligencia de Leads
      </h1>
      <LeadForm />
    </main>
  );
}