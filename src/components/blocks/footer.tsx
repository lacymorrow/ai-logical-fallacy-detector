export function Footer() {
  return (
    <footer className="border-t px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CLI Tool. All rights reserved.
      </div>
    </footer>
  );
}
