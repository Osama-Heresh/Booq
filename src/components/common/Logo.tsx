import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
  variant = 'dark',
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const titleSizes = {
    sm: 'text-base font-bold',
    md: 'text-xl font-black',
    lg: 'text-2xl font-black',
    xl: 'text-4xl font-black',
  };

  const subSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
  };

  const isLight = variant === 'light';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Traditional Arabic Herald Horn (بوق المنادي التراثي الأصيل) - Artistic Flair */}
      <div
        className={`relative flex items-center justify-center rounded-full transition-transform duration-300 hover:scale-105 shadow-sm ${
          iconSizes[size]
        } ${
          isLight
            ? 'bg-[#F27D26] text-white border-2 border-white/20'
            : 'bg-[#F27D26] text-white border-2 border-[#0F172A] shadow-md shadow-[#F27D26]/20'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="w-3/5 h-3/5 transform -scale-x-100"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span
            className={`tracking-tight font-cairo ${titleSizes[size]} ${
              isLight ? 'text-white' : 'text-[#0F172A]'
            }`}
          >
            بوق البلد
          </span>
          <span className="inline-block w-2 h-2 rounded-full bg-[#F27D26]"></span>
        </div>
        {showSubtitle && (
          <span
            className={`font-semibold tracking-wide ${subSizes[size]} ${
              isLight ? 'text-white/70' : 'text-[#64748B]'
            }`}
          >
            أفراحنا • أتراحنا • فزعتنا
          </span>
        )}
      </div>
    </div>
  );
};
